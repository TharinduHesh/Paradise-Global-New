/**
 * Email-link review moderation (see functions/_lib/reviewModeration.ts for the security model).
 *
 * POST /api/review-moderation { token, step: 'preview' }                          → the review and the link's action
 * POST /api/review-moderation { token, step: 'confirm', action, reason? }         → approve (publish) or reject
 *
 * There is no GET handler: opening an email link loads a static page and never changes anything. The API middleware
 * already refuses cross-site and non-JSON writes, so a link scanner cannot submit the confirmation.
 */
import { logActivity, sha256 } from '../_lib/admin';
import { multiLine, stripTags } from '../_lib/sanitize';
import { isModerationToken, reviewRecipient, type ModerationAction, type ModerationEnv } from '../_lib/reviewModeration';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Database { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown[]> }
interface Env extends ModerationEnv { DB: D1Database }

export const MAX_REJECTION_REASON = 500;

const fail = (code: string, message: string, status: number) => Response.json({ error: message, code }, { status });

type TokenRow = {
  review_id: number; action: ModerationAction; recipient: string; live: number; used_at: string | null;
  name: string; country: string; rating: number; message: string; status: string; created_at: string;
};

const findToken = (env: Env, tokenHash: string) => env.DB.prepare(`SELECT t.review_id, t.action, t.recipient, t.used_at,
    (t.expires_at > datetime('now')) AS live, r.name, r.country, r.rating, r.message, r.status, r.created_at
  FROM review_moderation_tokens t JOIN customer_reviews r ON r.id = t.review_id WHERE t.token_hash = ?`).bind(tokenHash).first<TokenRow>();

/** Explains why a token cannot be used, or returns null when it can. */
const problem = (row: TokenRow | null, recipient: string) => {
  if (!row || !recipient || row.recipient !== recipient) return fail('invalid', 'This moderation link is not valid.', 404);
  if (row.status !== 'pending') return fail('moderated', `This review has already been ${row.status === 'published' ? 'approved and published' : row.status}.`, 409);
  if (row.used_at) return fail('used', 'This moderation link has already been used.', 410);
  if (!row.live) return fail('expired', 'This moderation link has expired. Please moderate the review from the Manager Dashboard.', 410);
  return null;
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return fail('bad_request', 'Invalid request.', 400);
  }
  if (!isModerationToken(body.token)) return fail('invalid', 'This moderation link is not valid.', 404);
  if (body.step !== 'preview' && body.step !== 'confirm') return fail('bad_request', 'Invalid request.', 400);

  try {
    const tokenHash = await sha256(body.token);
    const recipient = reviewRecipient(env);
    const row = await findToken(env, tokenHash);
    const refused = problem(row, recipient);
    if (refused || !row) return refused;

    if (body.step === 'preview') {
      return Response.json({
        action: row.action,
        review: { name: row.name, country: row.country, rating: row.rating, message: row.message, status: row.status, submittedAt: row.created_at },
      });
    }

    // The confirm button names the action it performs; it must match the link, so a reject link can never approve.
    if (body.action !== row.action) return fail('bad_request', 'This link cannot perform that action.', 400);
    if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > MAX_REJECTION_REASON)) {
      return fail('bad_request', `The reason can be up to ${MAX_REJECTION_REASON} characters.`, 400);
    }
    const target = row.action === 'approve' ? 'published' : 'rejected';
    const reason = row.action === 'reject' && typeof body.reason === 'string' ? stripTags(multiLine(body.reason)) : '';

    // One atomic batch: the review changes only if it is still pending AND this exact token is still unused, unexpired
    // and addressed to the current recipient; then every token of the review is spent. Two simultaneous clicks, or an
    // approve and a reject racing each other, can therefore change the review at most once.
    const [update] = await env.DB.batch([
      env.DB.prepare(`UPDATE customer_reviews SET status = ?1,
          published_at = CASE WHEN ?1 = 'published' THEN COALESCE(published_at, datetime('now')) ELSE published_at END,
          rejection_reason = CASE WHEN ?1 = 'rejected' THEN ?2 ELSE rejection_reason END,
          updated_at = datetime('now')
        WHERE id = ?3 AND status = 'pending' AND EXISTS (SELECT 1 FROM review_moderation_tokens
          WHERE token_hash = ?4 AND review_id = ?3 AND action = ?5 AND recipient = ?6 AND used_at IS NULL AND expires_at > datetime('now'))`)
        .bind(target, reason, row.review_id, tokenHash, row.action, recipient),
      env.DB.prepare(`UPDATE review_moderation_tokens SET used_at = datetime('now')
        WHERE review_id = ? AND used_at IS NULL AND EXISTS (SELECT 1 FROM customer_reviews WHERE id = ? AND status <> 'pending')`)
        .bind(row.review_id, row.review_id),
    ]) as { meta?: { changes?: number } }[];
    if (update?.meta?.changes !== 1) return fail('moderated', 'This review has already been moderated.', 409);

    await logActivity(env as never, undefined, row.action, 'review', String(row.review_id), {
      via: 'email link', recipient, name: row.name, rating: row.rating, from: 'pending', to: target, ...(reason ? { reason } : {}),
    }).catch((error) => console.error('Unable to log email moderation:', error));
    return Response.json({ ok: true, status: target });
  } catch (error) {
    console.error('Review moderation failed:', error instanceof Error ? error.message : error);
    return fail('server', 'Unable to complete the request. Please try again.', 500);
  }
};
