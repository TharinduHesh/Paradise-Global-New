/**
 * Public customer reviews.
 * GET  /api/reviews  → published reviews only, with the rating summary. Never returns emails, IP hashes or unpublished reviews.
 * POST /api/reviews  → a visitor submits a review. It is saved as 'pending' and the manager is emailed one-time
 *                      approve/reject links (see functions/_lib/reviewModeration.ts).
 */
import { validateTurnstile } from '../_lib/turnstile';
import { sendReviewNotification, type EmailEnv, type ReviewModerationLinks } from '../_lib/email';
import { EMAIL, multiLine, singleLine, stripTags } from '../_lib/sanitize';
import { createModerationTokens, moderationLink, reviewRecipient } from '../_lib/reviewModeration';
import { mergeCompany } from '../../src/lib/companyInfo';
import { isReviewService, reviewLimits, type PublicReview, type ReviewSummary } from '../../src/lib/reviews';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
interface D1Database { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown[]> }

export interface ReviewsEnv extends EmailEnv {
  DB: D1Database;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** Who receives new-review emails (falls back to ADMIN_EMAIL). */
  REVIEW_NOTIFICATION_EMAIL?: string;
}

interface Context { request: Request; env: ReviewsEnv; waitUntil?: (promise: Promise<unknown>) => void }

const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 24;
const MAX_LINKS = 1;

const json = (body: unknown, status = 200) => Response.json(body, { status });
const fail = (message: string, status = 400) => json({ error: message }, status);

type Row = {
  id: number; name: string; country: string; service: string; rating: number; message: string;
  admin_reply: string; admin_reply_he: string; replied_at: string | null; published_at: string | null; created_at: string;
};

const toPublic = (row: Row): PublicReview => ({
  id: row.id,
  name: row.name,
  country: row.country,
  // The form no longer asks for a service; older reviews keep theirs.
  service: isReviewService(row.service) ? row.service : '',
  rating: row.rating,
  message: row.message,
  reply: row.admin_reply,
  replyHe: row.admin_reply_he,
  repliedAt: row.replied_at,
  publishedAt: row.published_at ?? row.created_at,
});

const summaryOf = async (db: D1Database): Promise<ReviewSummary> => {
  const rows = await db.prepare(`SELECT rating, COUNT(*) AS count FROM customer_reviews WHERE status = 'published' GROUP BY rating`)
    .all<{ rating: number; count: number }>();
  const breakdown: ReviewSummary['breakdown'] = [0, 0, 0, 0, 0];
  for (const row of rows.results) if (row.rating >= 1 && row.rating <= 5) breakdown[row.rating - 1] = Number(row.count);
  const count = breakdown.reduce((total, value) => total + value, 0);
  const sum = breakdown.reduce((total, value, index) => total + value * (index + 1), 0);
  return { count, breakdown, average: count ? Math.round((sum / count) * 10) / 10 : 0 };
};

export const onRequestGet = async ({ request, env }: Context) => {
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.get('page') ?? '1', 10) || 1));
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, Number.parseInt(params.get('pageSize') ?? '', 10) || DEFAULT_PAGE_SIZE));
  const service = params.get('service') ?? '';
  if (service && !isReviewService(service)) return fail('Unknown service.');
  try {
    const [list, summary] = await Promise.all([
      env.DB.prepare(`SELECT id, name, country, service, rating, message, admin_reply, admin_reply_he, replied_at, published_at, created_at
        FROM customer_reviews WHERE status = 'published' AND (? = '' OR service = ?)
        ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`)
        .bind(service, service, pageSize + 1, (page - 1) * pageSize).all<Row>(),
      summaryOf(env.DB),
    ]);
    return json({
      reviews: list.results.slice(0, pageSize).map(toPublic),
      summary,
      hasMore: list.results.length > pageSize,
      siteKey: env.TURNSTILE_SECRET_KEY ? env.TURNSTILE_SITE_KEY ?? null : null,
    });
  } catch (error) {
    console.error('Unable to load reviews:', error instanceof Error ? error.message : error);
    return fail('Unable to load reviews.', 500);
  }
};

export const onRequestPost = async (context: Context) => {
  const { request, env } = context;
  if (Number(request.headers.get('Content-Length')) > 16384) return fail('Review is too large.', 413);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('Invalid request body.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid request body.');
  const input = body as Record<string, unknown>;

  const textFields = ['name', 'email', 'country', 'service', 'message', 'website'] as const;
  const wrongType = textFields.find((field) => input[field] !== undefined && typeof input[field] !== 'string');
  if (wrongType) return fail(`The ${wrongType} field must be text.`);
  const raw = Object.fromEntries(textFields.map((field) => [field, (input[field] as string | undefined) ?? ''])) as Record<typeof textFields[number], string>;

  // A bot filled the hidden honeypot field: pretend success so it learns nothing, but save and send nothing.
  if (raw.website.trim()) return json({ ok: true }, 201);

  if (raw.name.length > reviewLimits.name) return fail('The name field is too long.');
  if (raw.email.length > reviewLimits.email) return fail('The email field is too long.');
  if (raw.country.length > reviewLimits.country) return fail('The country field is too long.');
  if (raw.message.length > reviewLimits.message) return fail(`Reviews can be up to ${reviewLimits.message} characters.`);

  const clean = {
    name: stripTags(singleLine(raw.name)),
    email: raw.email.trim().toLowerCase(),
    country: stripTags(singleLine(raw.country)),
    service: raw.service.trim(),
    message: stripTags(multiLine(raw.message)),
  };
  const rating = input.rating;
  if (!clean.name) return fail('The name field is required.');
  if (!EMAIL.test(clean.email)) return fail('Enter a valid email address.');
  // Service is optional (the form no longer asks for it); anything unrecognised is stored as blank.
  const service = isReviewService(clean.service) ? clean.service : '';
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) return fail('Choose a rating from 1 to 5 stars.');
  if (clean.message.length < reviewLimits.minMessage) return fail(`Please write at least ${reviewLimits.minMessage} characters.`);
  if ((clean.message.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) return fail('Please remove the links from your review.');

  let stored: { id: number; created_at: string } | null;
  try {
    const secret = env.TURNSTILE_SECRET_KEY;
    if (secret && !await validateTurnstile(request, secret, input.turnstileToken, 'review')) {
      return fail('Complete the security check and try again.', 403);
    }
    // The same review sent again (a double click, a resubmitted form) is accepted without saving or emailing twice.
    const duplicate = await env.DB.prepare(`SELECT id FROM customer_reviews
      WHERE email = ? AND message = ? AND created_at > datetime('now', '-30 days') LIMIT 1`).bind(clean.email, clean.message).first();
    if (duplicate) return json({ ok: true, duplicate: true });

    // There is deliberately no per-visitor submission limit; nothing is shown publicly until a manager approves it.
    stored = await env.DB.prepare(`INSERT INTO customer_reviews (name, email, country, service, rating, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending') RETURNING id, created_at`)
      .bind(clean.name, clean.email, clean.country, service, rating, clean.message)
      .first<{ id: number; created_at: string }>();
    if (!stored) throw new Error('The database did not return the saved review.');
  } catch (error) {
    console.error('Unable to save review:', error instanceof Error ? error.message : error);
    return fail('Unable to save your review. Please try again later.', 500);
  }

  // The review is stored. One-time approve/reject links are created for the recipient; if that fails, the email still
  // goes out with only the dashboard button. Everything below runs after the response so the visitor never waits.
  const review = { ...clean, rating, id: stored.id, createdAt: stored.created_at };
  const reviewId = stored.id;
  const recipient = reviewRecipient(env);
  const links: Promise<ReviewModerationLinks | undefined> = recipient
    ? createModerationTokens(env.DB, reviewId, recipient)
      .then((tokens) => ({ approve: moderationLink(tokens.approve), reject: moderationLink(tokens.reject) }))
      .catch((error) => { console.error(`Review #${reviewId}: unable to create moderation links:`, error instanceof Error ? error.message : error); return undefined; })
    : Promise.resolve(undefined);
  const company = env.DB.prepare('SELECT value_json FROM site_settings WHERE key = ?').bind('company').first<{ value_json: string }>()
    .then((row) => mergeCompany(row ? JSON.parse(row.value_json) : null))
    .catch(() => mergeCompany(null));
  const email = Promise.all([company, links]).then(([info, moderation]) => sendReviewNotification(env, review, info, moderation));
  if (context.waitUntil) context.waitUntil(email);
  else await email;

  return json({ ok: true }, 201);
};
