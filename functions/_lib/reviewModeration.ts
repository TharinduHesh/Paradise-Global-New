/**
 * One-time approve/reject links for the new-review email.
 *
 * Security model:
 * - Each token is 32 random bytes (256 bits) from crypto.getRandomValues; only its SHA-256 hash is stored.
 * - A token is bound to one review, one action ('approve' or 'reject') and the recipient it was emailed to.
 * - Tokens expire after 48 hours, work once, and every token of a review is spent as soon as the review is moderated
 *   by any route (email link or dashboard).
 * - The token travels in the URL fragment (#token=…), which browsers never send to servers or in Referer headers, so it
 *   does not appear in server, proxy or email-scanner logs. Opening a link only shows a page; a status change needs an
 *   explicit POST from the confirm button (see functions/api/review-moderation.ts).
 */
import { randomId, sha256 } from './admin';

export const MODERATION_TOKEN_HOURS = 48;
export const SITE_URL = 'https://paradisegloballeisures.com';
export type ModerationAction = 'approve' | 'reject';

interface D1Statement { bind(...values: unknown[]): D1Statement }
interface D1Database { prepare(query: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown[]> }

export interface ModerationEnv { REVIEW_NOTIFICATION_EMAIL?: string; ADMIN_EMAIL?: string }

/** Where new-review emails go, and the only address whose links are honoured. */
export const reviewRecipient = (env: ModerationEnv) => (env.REVIEW_NOTIFICATION_EMAIL || env.ADMIN_EMAIL || '').trim().toLowerCase();

export const isModerationToken = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

const newToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export const moderationLink = (token: string) => `${SITE_URL}/review-moderation#token=${token}`;

/** Creates an approve and a reject token for a review and returns the raw tokens (to email); only hashes are stored. */
export const createModerationTokens = async (db: D1Database, reviewId: number, recipient: string) => {
  const tokens = { approve: newToken(), reject: newToken() };
  await db.batch([
    // Housekeeping: links that expired more than a week ago can never be used, so they are removed.
    db.prepare("DELETE FROM review_moderation_tokens WHERE expires_at < datetime('now', '-7 days')"),
    ...await Promise.all((Object.keys(tokens) as ModerationAction[]).map(async (action) => db.prepare(`INSERT INTO review_moderation_tokens
        (id, review_id, action, token_hash, recipient, expires_at) VALUES (?, ?, ?, ?, ?, datetime('now', ?))`)
      .bind(randomId(), reviewId, action, await sha256(tokens[action]), recipient, `+${MODERATION_TOKEN_HOURS} hours`))),
  ]);
  return tokens;
};

/** Spends every unused token of a review; added to the same batch as any moderation so it happens atomically. */
export const spendModerationTokens = <S extends { bind(...values: unknown[]): S }>(db: { prepare(query: string): S }, reviewId: number | string) =>
  db.prepare("UPDATE review_moderation_tokens SET used_at = datetime('now') WHERE review_id = ? AND used_at IS NULL").bind(reviewId);
