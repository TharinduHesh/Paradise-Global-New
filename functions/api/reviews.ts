/**
 * Public customer reviews.
 * GET  /api/reviews  → published reviews only, with the rating summary. Never returns emails, IP hashes or unpublished reviews.
 * POST /api/reviews  → a visitor submits a review. It is saved as 'pending' and the admin is emailed.
 */
import { validateTurnstile } from '../_lib/turnstile';
import { sendReviewNotification, type EmailEnv } from '../_lib/email';
import { sha256 } from '../_lib/admin';
import { EMAIL, multiLine, singleLine, stripTags } from '../_lib/sanitize';
import { mergeCompany } from '../../src/lib/companyInfo';
import { isReviewService, reviewLimits, reviewServices, type PublicReview, type ReviewService, type ReviewSummary } from '../../src/lib/reviews';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
interface D1Database { prepare(query: string): D1Statement }

export interface ReviewsEnv extends EmailEnv {
  DB: D1Database;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface Context { request: Request; env: ReviewsEnv; waitUntil?: (promise: Promise<unknown>) => void }

/** Submissions allowed per visitor IP and per email address before further ones are refused for a while. */
export const REVIEW_RATE_LIMITS = { perIpHour: 3, perIpDay: 6, perEmailDay: 3 } as const;
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
  service: (isReviewService(row.service) ? row.service : 'general') as ReviewService,
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
  if (!isReviewService(clean.service)) return fail('Select the service you are reviewing.');
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) return fail('Choose a rating from 1 to 5 stars.');
  if (clean.message.length < reviewLimits.minMessage) return fail(`Please write at least ${reviewLimits.minMessage} characters.`);
  if ((clean.message.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) return fail('Please remove the links from your review.');

  const ipHash = await sha256(`review-ip:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`);
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

    const usage = await env.DB.prepare(`SELECT
        (SELECT COUNT(*) FROM customer_reviews WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')) AS ip_hour,
        (SELECT COUNT(*) FROM customer_reviews WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 day')) AS ip_day,
        (SELECT COUNT(*) FROM customer_reviews WHERE email = ?2 AND created_at > datetime('now', '-1 day')) AS email_day`)
      .bind(ipHash, clean.email).first<{ ip_hour: number; ip_day: number; email_day: number }>();
    if (usage && (usage.ip_hour >= REVIEW_RATE_LIMITS.perIpHour || usage.ip_day >= REVIEW_RATE_LIMITS.perIpDay
      || usage.email_day >= REVIEW_RATE_LIMITS.perEmailDay)) {
      return fail('You have sent several reviews recently. Please try again later.', 429);
    }

    stored = await env.DB.prepare(`INSERT INTO customer_reviews (name, email, country, service, rating, message, status, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?) RETURNING id, created_at`)
      .bind(clean.name, clean.email, clean.country, clean.service, rating, clean.message, ipHash)
      .first<{ id: number; created_at: string }>();
    if (!stored) throw new Error('The database did not return the saved review.');
  } catch (error) {
    console.error('Unable to save review:', error instanceof Error ? error.message : error);
    return fail('Unable to save your review. Please try again later.', 500);
  }

  // The review is stored; the admin email goes out after the response so a slow email never delays the visitor.
  const review = { ...clean, rating, service: reviewServices[clean.service], id: stored.id, createdAt: stored.created_at };
  const email = env.DB.prepare('SELECT value_json FROM site_settings WHERE key = ?').bind('company').first<{ value_json: string }>()
    .then((row) => mergeCompany(row ? JSON.parse(row.value_json) : null))
    .catch(() => mergeCompany(null))
    .then((company) => sendReviewNotification(env, review, company));
  if (context.waitUntil) context.waitUntil(email);
  else await email;

  return json({ ok: true }, 201);
};
