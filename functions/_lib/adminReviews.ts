/**
 * Review moderation for the admin console (/api/admin/reviews…). The admin router only calls this for Owners, Admins and
 * Managers, after authentication and the anti-CSRF check.
 *
 * GET    reviews          list with search, status, service, rating filters and pagination, plus counts per status
 * PATCH  reviews/:id      { action?: approve | publish | unpublish | reject, reply?: string, reason?: string (reject) }
 * DELETE reviews/:id      delete permanently (Owners and Admins only)
 */
import { isReviewService, reviewActions, reviewLimits, reviewStatuses, type ReviewAction, type ReviewStatus } from '../../src/lib/reviews';
import { isAdministrator } from '../../src/lib/adminAccess';
import { error, json, logActivity, readJson, type AdminEnv, type AdminUser } from './admin';
import { multiLine, stripTags } from './sanitize';
import { spendModerationTokens } from './reviewModeration';
import { translateToHebrew } from './translate';

export const ADMIN_REVIEW_PAGE_SIZE = 20;

const isStatus = (value: string): value is ReviewStatus => (reviewStatuses as readonly string[]).includes(value);
const isAction = (value: unknown): value is ReviewAction => typeof value === 'string' && Object.hasOwn(reviewActions, value);

export async function manageReviews(env: AdminEnv, request: Request, actor: AdminUser, path: string) {
  const db = env.DB;
  const match = /^reviews(?:\/(\d+))?$/.exec(path);
  if (!match) return error('Review route not found.', 404);
  const id = match[1];

  if (!id && request.method === 'GET') {
    const params = new URL(request.url).searchParams;
    const search = (params.get('search') ?? '').trim().slice(0, 100);
    const status = params.get('status') ?? '';
    const service = params.get('service') ?? '';
    const rating = params.get('rating') ?? '';
    if (status && !isStatus(status)) return error('Invalid review status.');
    if (service && !isReviewService(service)) return error('Invalid service.');
    if (rating && !/^[1-5]$/.test(rating)) return error('Invalid rating.');
    const page = Math.max(1, Math.min(100000, Number.parseInt(params.get('page') ?? '1', 10) || 1));
    const like = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const filter = `WHERE (? = '' OR r.name LIKE ? ESCAPE '\\' OR r.email LIKE ? ESCAPE '\\' OR r.message LIKE ? ESCAPE '\\' OR r.country LIKE ? ESCAPE '\\')
      AND (? = '' OR r.service = ?) AND (? = '' OR r.rating = CAST(? AS INTEGER))`;
    const values = [search, like, like, like, like, service, service, rating, rating];
    const [list, counts] = await Promise.all([
      db.prepare(`SELECT r.id, r.name, r.email, r.country, r.service, r.rating, r.message, r.status, r.rejection_reason, r.admin_reply, r.admin_reply_he,
          r.replied_at, r.published_at, r.created_at, r.updated_at, u.name AS replied_by_name
        FROM customer_reviews r LEFT JOIN admin_users u ON u.id = r.replied_by
        ${filter} AND (? = '' OR r.status = ?)
        ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`)
        .bind(...values, status, status, ADMIN_REVIEW_PAGE_SIZE + 1, (page - 1) * ADMIN_REVIEW_PAGE_SIZE).all(),
      // Counts follow the search and filters, so each status tab shows how many matches it holds.
      db.prepare(`SELECT r.status, COUNT(*) AS count FROM customer_reviews r ${filter} GROUP BY r.status`)
        .bind(...values).all<{ status: ReviewStatus; count: number }>(),
    ]);
    const statusCounts = Object.fromEntries(reviewStatuses.map((key) => [key, 0])) as Record<ReviewStatus, number>;
    for (const row of counts.results) if (isStatus(row.status)) statusCounts[row.status] = Number(row.count);
    return json({
      reviews: list.results.slice(0, ADMIN_REVIEW_PAGE_SIZE),
      hasMore: list.results.length > ADMIN_REVIEW_PAGE_SIZE,
      counts: statusCounts,
    });
  }

  if (!id) return error('Review route not found.', 404);
  const existing = await db.prepare('SELECT id, name, rating, status, admin_reply FROM customer_reviews WHERE id = ?')
    .bind(id).first<{ id: number; name: string; rating: number; status: ReviewStatus; admin_reply: string }>();
  if (!existing) return error('Review not found.', 404);

  if (request.method === 'DELETE') {
    if (!isAdministrator(actor.role)) return error('Only Owners and Admins can delete reviews.', 403);
    await db.batch([
      db.prepare('DELETE FROM review_moderation_tokens WHERE review_id = ?').bind(id),
      db.prepare('DELETE FROM customer_reviews WHERE id = ?').bind(id),
    ]);
    await logActivity(env, actor.id, 'delete', 'review', id, { name: existing.name, rating: existing.rating, status: existing.status });
    return json({ ok: true });
  }

  if (request.method === 'PATCH') {
    const body = await readJson<{ action?: unknown; reply?: unknown; reason?: unknown }>(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid review changes.');
    const { action, reply } = body;
    if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 500)) return error('The reason can be up to 500 characters.');
    const reason = action === 'reject' && typeof body.reason === 'string' ? stripTags(multiLine(body.reason)) : '';
    if (action === undefined && reply === undefined) return error('Nothing to change.');
    if (action !== undefined && !isAction(action)) return error('Invalid moderation action.');
    if (reply !== undefined && (typeof reply !== 'string' || reply.length > reviewLimits.reply)) {
      return error(`Replies can be up to ${reviewLimits.reply} characters.`);
    }

    let nextStatus: ReviewStatus | null = null;
    if (action) {
      const rule = reviewActions[action];
      if (!(rule.from as readonly ReviewStatus[]).includes(existing.status)) {
        return error(`This review is ${existing.status}, so it cannot be ${action === 'approve' ? 'approved' : `${action}ed`}.`, 409);
      }
      nextStatus = rule.to;
    }

    let replyText: string | null = null;
    let replyHebrew = '';
    let translationFailed = false;
    if (typeof reply === 'string') {
      replyText = stripTags(multiLine(reply));
      if (replyText) {
        // Admins reply in English; the Hebrew site shows a translation. If translation is unavailable the English reply is shown.
        try { [replyHebrew] = await translateToHebrew([replyText], env); } catch (reason) {
          translationFailed = true;
          console.error('Review reply translation failed:', reason instanceof Error ? reason.message : reason);
        }
      }
    }

    // A status change applies only if the review is still in the status this request saw (an email-link approval may have
    // landed meanwhile), and it spends any outstanding email links in the same atomic batch.
    const statements = [db.prepare(`UPDATE customer_reviews SET
        status = COALESCE(?1, status),
        published_at = CASE WHEN ?1 = 'published' THEN COALESCE(published_at, datetime('now')) ELSE published_at END,
        rejection_reason = CASE WHEN ?1 = 'rejected' THEN ?8 WHEN ?1 IS NOT NULL THEN '' ELSE rejection_reason END,
        admin_reply = CASE WHEN ?2 THEN ?3 ELSE admin_reply END,
        admin_reply_he = CASE WHEN ?2 THEN ?4 ELSE admin_reply_he END,
        replied_at = CASE WHEN ?2 THEN (CASE WHEN ?3 = '' THEN NULL ELSE datetime('now') END) ELSE replied_at END,
        replied_by = CASE WHEN ?2 THEN (CASE WHEN ?3 = '' THEN NULL ELSE ?5 END) ELSE replied_by END,
        updated_at = datetime('now')
      WHERE id = ?6 AND (?1 IS NULL OR status = ?7)`)
      .bind(nextStatus, replyText === null ? 0 : 1, replyText ?? '', replyHebrew, actor.id, id, existing.status, reason)];
    if (action) statements.push(spendModerationTokens(db, id));
    const [update] = await db.batch(statements) as { meta?: { changes?: number } }[];
    if (action && update?.meta?.changes !== 1) return error('This review was changed by someone else. Refresh and try again.', 409);

    if (action) {
      await logActivity(env, actor.id, action, 'review', id, { name: existing.name, rating: existing.rating, from: existing.status, to: nextStatus, ...(reason ? { reason } : {}) });
    }
    if (replyText !== null && replyText !== existing.admin_reply) {
      await logActivity(env, actor.id, replyText ? 'reply' : 'remove_reply', 'review', id, { name: existing.name });
    }
    return json({ ok: true, status: nextStatus ?? existing.status, translationFailed });
  }

  return error('Review route not found.', 404);
}
