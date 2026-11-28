/**
 * Review submission and moderation tests. Runs the real Pages Functions against an in-memory SQLite database built from
 * the real migrations, through a small D1-compatible adapter. External services (Turnstile, Resend, Workers AI) are mocked.
 *
 *   npm run test:reviews
 */
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { onRequestGet, onRequestPost, REVIEW_RATE_LIMITS } from '../functions/api/reviews';
import { onRequest as adminRequest } from '../functions/api/admin/[[path]]';
import { sha256 } from '../functions/_lib/admin';

/* ------------------------------------------------------------------ D1 adapter over node:sqlite */

type Value = string | number | null;
/**
 * D1 supports numbered parameters (?1, ?2 …) as well as plain ?; node:sqlite treats numbered ones as named. Rewrite them
 * to plain ? with the values repeated in order, so the production SQL runs unchanged.
 */
const expandNumbered = (sql: string, params: Value[]): [string, Value[]] => {
  if (!/\?\d+/.test(sql)) return [sql, params];
  const ordered: Value[] = [];
  return [sql.replace(/\?(\d+)/g, (_, index: string) => { ordered.push(params[Number(index) - 1]); return '?'; }), ordered];
};
class Statement {
  private sql: string;
  private params: Value[];
  constructor(private db: DatabaseSync, sql: string, params: Value[] = []) {
    this.raw = sql;
    [this.sql, this.params] = expandNumbered(sql, params);
  }
  private raw: string;
  bind(...values: unknown[]) { return new Statement(this.db, this.raw, values.map((value) => (typeof value === 'boolean' ? Number(value) : value as Value))); }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...this.params) as T[] }; }
  async run() { this.runSync(); return { success: true }; }
  runSync() { return this.db.prepare(this.sql).run(...this.params); }
}
const d1 = (db: DatabaseSync) => ({
  prepare: (sql: string) => new Statement(db, sql),
  async batch(statements: Statement[]) {
    db.exec('BEGIN');
    try { const results = statements.map((statement) => statement.runSync()); db.exec('COMMIT'); return results; } catch (error) { db.exec('ROLLBACK'); throw error; }
  },
});

/* ------------------------------------------------------------------ Test environment */

const SITE = 'https://paradisegloballeisures.com';
const migrations = readdirSync('migrations').filter((file) => file.endsWith('.sql')).sort();
const contactTable = readFileSync('schema.sql', 'utf8').split(';')[0];

let db: DatabaseSync;
let env: Record<string, unknown>;
let fetchCalls: { url: string; init?: RequestInit }[];
let turnstileReply: { success: boolean; hostname?: string; action?: string };
const realFetch = globalThis.fetch;

const buildDatabase = () => {
  const database = new DatabaseSync(':memory:');
  database.exec(contactTable);
  for (const file of migrations) database.exec(readFileSync(join('migrations', file), 'utf8'));
  return database;
};

const resetEnv = () => {
  db = buildDatabase();
  fetchCalls = [];
  turnstileReply = { success: true, hostname: 'paradisegloballeisures.com', action: 'review' };
  env = {
    DB: d1(db),
    RESEND_API_KEY: 're_test', ADMIN_EMAIL: 'owner@example.test', FROM_EMAIL: 'Site <noreply@example.test>',
    AI: { run: async (_model: string, input: { text: string }) => ({ translated_text: `HE:${input.text}` }) },
  };
};

before(() => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    fetchCalls.push({ url, init });
    if (url.includes('turnstile')) return Response.json(turnstileReply);
    if (url.includes('api.resend.com')) return Response.json({ id: 'email_1' });
    throw new Error(`Unexpected fetch to ${url}`);
  }) as typeof fetch;
});
after(() => { globalThis.fetch = realFetch; });
beforeEach(resetEnv);

const validReview = { name: 'Anna Perera', email: 'Anna@Example.com', country: 'Sri Lanka', service: 'construction', rating: 5, message: 'Excellent team, our villa was finished on time.' };

const post = async (body: unknown, ip = '203.0.113.7') => {
  const pending: Promise<unknown>[] = [];
  const response = await onRequestPost({
    request: new Request(`${SITE}/api/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) }),
    env: env as never,
    waitUntil: (promise) => { pending.push(promise); },
  });
  await Promise.all(pending);
  return { status: response.status, body: await response.json() as Record<string, unknown> };
};
const get = async (query = '') => {
  const response = await onRequestGet({ request: new Request(`${SITE}/api/reviews${query}`), env: env as never });
  const text = await response.text();
  return { status: response.status, text, body: JSON.parse(text) as Record<string, any> };
};
const rows = () => db.prepare('SELECT * FROM customer_reviews ORDER BY id').all() as Record<string, any>[];
const resendCalls = () => fetchCalls.filter((call) => call.url.includes('api.resend.com'));

/** Creates a staff account with a live session and returns a request helper signed in as it. */
const signIn = async (role: 'owner' | 'admin' | 'editor' | 'manager') => {
  const id = `user-${role}`;
  const token = `token-${role}`;
  db.prepare("INSERT INTO admin_users (id, email, name, password_hash, role) VALUES (?, ?, ?, 'x', ?)").run(id, `${role}@example.test`, `${role} user`, role);
  db.prepare("INSERT INTO admin_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+20 minutes'))").run(`s-${role}`, id, await sha256(token));
  const csrf = await sha256(`csrf:${token}`);
  return async (path: string, method = 'GET', body?: unknown, options: { csrf?: boolean } = {}) => {
    const headers: Record<string, string> = { Cookie: `pgl_admin_session=${token}`, 'Content-Type': 'application/json' };
    if (method !== 'GET' && options.csrf !== false) headers['X-CSRF-Token'] = csrf;
    const response = await adminRequest({ request: new Request(`${SITE}/api/admin/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env: env as never });
    return { status: response.status, body: await response.json() as Record<string, any> };
  };
};

const insertReview = (values: Partial<Record<string, Value>> = {}) => {
  const review = { name: 'Guest', email: 'guest@example.com', country: '', service: 'hospitality', rating: 4, message: 'A lovely stay overall.', status: 'pending', ...values };
  const result = db.prepare(`INSERT INTO customer_reviews (name, email, country, service, rating, message, status, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN datetime('now') END)`)
    .run(review.name, review.email, review.country, review.service, review.rating, review.message, review.status, review.status);
  return Number(result.lastInsertRowid);
};

/* ------------------------------------------------------------------ Migration */

describe('migration 0006', () => {
  it('adds customer_reviews without touching existing enquiries or testimonials', () => {
    const database = new DatabaseSync(':memory:');
    database.exec(contactTable);
    for (const file of migrations.filter((name) => name < '0006')) database.exec(readFileSync(join('migrations', file), 'utf8'));
    database.prepare("INSERT INTO contact_enquiries (name, email, phone, service, property_location, message) VALUES ('Old', 'old@example.com', '', '', '', 'Hello')").run();
    database.prepare(`INSERT INTO content_items (id, content_type, slug, title, data_json, is_published) VALUES ('t1', 'testimonial', 'jane', 'Jane', '{"quote":"Great"}', 1)`).run();
    database.exec(readFileSync(join('migrations', migrations.find((name) => name.startsWith('0006'))!), 'utf8'));
    assert.equal((database.prepare('SELECT COUNT(*) AS n FROM contact_enquiries').get() as { n: number }).n, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS n FROM content_items WHERE content_type = 'testimonial'").get() as { n: number }).n, 1);
    assert.equal((database.prepare('SELECT COUNT(*) AS n FROM customer_reviews').get() as { n: number }).n, 0);
    assert.throws(() => database.prepare("INSERT INTO customer_reviews (name, email, service, rating, message) VALUES ('a', 'b', 'general', 6, 'x')").run(), /CHECK/);
  });
});

/* ------------------------------------------------------------------ Public submission */

describe('POST /api/reviews', () => {
  it('saves a valid review as pending, emails the admin, and keeps it off the public list', async () => {
    const result = await post(validReview);
    assert.equal(result.status, 201);
    const [saved] = rows();
    assert.equal(saved.status, 'pending');
    assert.equal(saved.email, 'anna@example.com');
    assert.equal(saved.rating, 5);
    assert.match(saved.ip_hash, /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(saved).includes('203.0.113.7'), 'the raw IP address is never stored');

    const emails = resendCalls();
    assert.equal(emails.length, 1);
    const email = JSON.parse(String(emails[0].init?.body));
    assert.deepEqual(email.to, ['owner@example.test']);
    assert.equal(email.reply_to, 'anna@example.com');
    assert.match(email.subject, /5-Star Review/);
    assert.equal(new Headers(emails[0].init?.headers).get('Idempotency-Key'), `review-${saved.id}-admin`);

    const list = await get();
    assert.equal(list.body.reviews.length, 0);
    assert.equal(list.body.summary.count, 0);
  });

  it('rejects invalid input', async () => {
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ ...validReview, rating: 0 }, /rating/],
      [{ ...validReview, rating: 4.5 }, /rating/],
      [{ ...validReview, rating: '5' }, /rating/],
      [{ ...validReview, email: 'not-an-email' }, /email/],
      [{ ...validReview, service: 'spa' }, /service/],
      [{ ...validReview, name: '   ' }, /name/],
      [{ ...validReview, message: 'Too short' }, /at least/],
      [{ ...validReview, message: 'Great! https://a.example and https://b.example' }, /links/],
      [{ ...validReview, name: 'x'.repeat(101) }, /too long/],
      [{ ...validReview, message: 'x'.repeat(2001) }, /2000/],
      [{ ...validReview, country: 42 }, /must be text/],
    ];
    for (const [body, message] of cases) {
      const result = await post(body);
      assert.equal(result.status, 400, JSON.stringify(body).slice(0, 80));
      assert.match(String(result.body.error), message);
    }
    assert.equal((await post([1, 2])).status, 400);
    assert.equal(rows().length, 0);
    assert.equal(resendCalls().length, 0);
  });

  it('strips markup and control characters', async () => {
    await post({ ...validReview, name: '<b>Anna</b>\r\nBcc: x@y.z', message: 'Great <script>alert(1)</script>service\u0007 overall!' });
    const [saved] = rows();
    assert.equal(saved.name, 'Anna Bcc: x@y.z');
    assert.equal(saved.message, 'Great alert(1)service overall!');
  });

  it('silently drops honeypot submissions', async () => {
    const result = await post({ ...validReview, website: 'http://spam.example' });
    assert.equal(result.status, 201);
    assert.equal(rows().length, 0);
    assert.equal(resendCalls().length, 0);
  });

  it('accepts a duplicate submission once', async () => {
    assert.equal((await post(validReview)).status, 201);
    const again = await post({ ...validReview, email: 'anna@example.com' });
    assert.equal(again.status, 200);
    assert.equal(again.body.duplicate, true);
    assert.equal(rows().length, 1);
    assert.equal(resendCalls().length, 1);
  });

  it('rate limits by IP address and by email', async () => {
    for (let index = 0; index < REVIEW_RATE_LIMITS.perIpHour; index += 1) {
      assert.equal((await post({ ...validReview, email: `p${index}@example.com`, message: `Review number ${index} with detail.` })).status, 201);
    }
    assert.equal((await post({ ...validReview, email: 'new@example.com', message: 'One more review from here.' })).status, 429);
    assert.equal((await post({ ...validReview, email: 'new@example.com', message: 'One more review from elsewhere.' }, '198.51.100.1')).status, 201);

    for (let index = 0; index < REVIEW_RATE_LIMITS.perEmailDay - 1; index += 1) {
      await post({ ...validReview, email: 'same@example.com', message: `Same person, review ${index}.` }, `192.0.2.${index + 10}`);
    }
    await post({ ...validReview, email: 'same@example.com', message: 'Same person, last allowed.' }, '192.0.2.50');
    assert.equal((await post({ ...validReview, email: 'same@example.com', message: 'Same person, too many.' }, '192.0.2.60')).status, 429);
  });

  it('requires a valid Turnstile token for the review action when configured', async () => {
    env.TURNSTILE_SECRET_KEY = 'secret';
    assert.equal((await post(validReview)).status, 403);
    turnstileReply = { success: true, hostname: 'paradisegloballeisures.com', action: 'contact' };
    assert.equal((await post({ ...validReview, turnstileToken: 'token' })).status, 403, 'a token for another form is refused');
    turnstileReply = { success: true, hostname: 'paradisegloballeisures.com', action: 'review' };
    assert.equal((await post({ ...validReview, turnstileToken: 'token' })).status, 201);
    assert.equal(rows().length, 1);
  });
});

/* ------------------------------------------------------------------ Public listing */

describe('GET /api/reviews', () => {
  it('returns published reviews only, without private data, and a genuine summary', async () => {
    insertReview({ name: 'Pub Five', email: 'five@private.test', rating: 5, status: 'published', service: 'construction' });
    insertReview({ name: 'Pub Four', email: 'four@private.test', rating: 4, status: 'published' });
    insertReview({ name: 'Pending One', rating: 1, status: 'pending' });
    insertReview({ name: 'Rejected One', rating: 1, status: 'rejected' });
    insertReview({ name: 'Hidden One', rating: 1, status: 'hidden' });

    const result = await get();
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.reviews.map((review: { name: string }) => review.name).sort(), ['Pub Five', 'Pub Four']);
    assert.deepEqual(result.body.summary, { count: 2, average: 4.5, breakdown: [0, 0, 0, 1, 1] });
    for (const secret of ['private.test', 'ip_hash', 'email', 'status', 'Pending One', 'Hidden One', 'Rejected One']) {
      assert.ok(!result.text.includes(secret), `response must not contain "${secret}"`);
    }
    assert.equal(result.body.siteKey, null);

    const filtered = await get('?service=construction');
    assert.deepEqual(filtered.body.reviews.map((review: { name: string }) => review.name), ['Pub Five']);
    assert.equal(filtered.body.summary.count, 2, 'the summary always covers every published review');
    assert.equal((await get('?service=unknown')).status, 400);
  });

  it('paginates', async () => {
    for (let index = 0; index < 5; index += 1) insertReview({ name: `R${index}`, status: 'published' });
    const first = await get('?pageSize=2&page=1');
    assert.equal(first.body.reviews.length, 2);
    assert.equal(first.body.hasMore, true);
    const last = await get('?pageSize=2&page=3');
    assert.equal(last.body.reviews.length, 1);
    assert.equal(last.body.hasMore, false);
    assert.equal((await get('?pageSize=500')).body.reviews.length, 5);
  });
});

/* ------------------------------------------------------------------ Admin moderation */

describe('admin review management', () => {
  it('requires a signed-in Owner or Admin and the anti-CSRF token', async () => {
    const anonymous = await adminRequest({ request: new Request(`${SITE}/api/admin/reviews`), env: env as never });
    assert.equal(anonymous.status, 401);
    const id = insertReview();
    for (const role of ['editor', 'manager'] as const) {
      const as = await signIn(role);
      assert.equal((await as('reviews')).status, 403, `${role} cannot list reviews`);
      assert.equal((await as(`reviews/${id}`, 'PATCH', { action: 'approve' })).status, 403, `${role} cannot moderate`);
    }
    const owner = await signIn('owner');
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'approve' }, { csrf: false })).status, 403);
    assert.equal(rows()[0].status, 'pending');
  });

  it('lists with status counts, filters, search and pagination', async () => {
    const admin = await signIn('admin');
    insertReview({ name: 'Alice', rating: 5, service: 'construction', status: 'pending', country: 'Israel' });
    insertReview({ name: 'Bob', rating: 2, service: 'hospitality', status: 'published' });
    insertReview({ name: 'Cara', rating: 5, service: 'hospitality', status: 'rejected' });
    insertReview({ name: 'Dan_100%', rating: 3, service: 'general', status: 'hidden' });

    const all = await admin('reviews');
    assert.equal(all.status, 200);
    assert.equal(all.body.reviews.length, 4);
    assert.deepEqual(all.body.counts, { pending: 1, published: 1, rejected: 1, hidden: 1 });
    assert.ok(all.body.reviews[0].email, 'admins can see the private email');

    assert.deepEqual((await admin('reviews?status=pending')).body.reviews.map((r: { name: string }) => r.name), ['Alice']);
    assert.deepEqual((await admin('reviews?rating=5')).body.reviews.map((r: { name: string }) => r.name).sort(), ['Alice', 'Cara']);
    assert.deepEqual((await admin('reviews?service=hospitality&rating=5')).body.reviews.map((r: { name: string }) => r.name), ['Cara']);
    assert.deepEqual((await admin('reviews?search=israel')).body.reviews.map((r: { name: string }) => r.name), ['Alice']);
    assert.deepEqual((await admin('reviews?search=_100%25')).body.reviews.map((r: { name: string }) => r.name), ['Dan_100%'], 'LIKE wildcards are matched literally');
    assert.equal((await admin('reviews?status=deleted')).status, 400);
    assert.equal((await admin('reviews?rating=9')).status, 400);

    for (let index = 0; index < 21; index += 1) insertReview({ name: `Bulk ${index}` });
    const page1 = await admin('reviews?status=pending&page=1');
    assert.equal(page1.body.reviews.length, 20);
    assert.equal(page1.body.hasMore, true);
    assert.equal((await admin('reviews?status=pending&page=2')).body.reviews.length, 2);
  });

  it('approves, unpublishes, republishes and rejects with valid transitions only, logging each action', async () => {
    const owner = await signIn('owner');
    const id = insertReview({ name: 'Moderated', rating: 4 });

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'unpublish' })).status, 409, 'a pending review cannot be unpublished');
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'approve' })).status, 200);
    let [review] = rows();
    assert.equal(review.status, 'published');
    assert.ok(review.published_at);
    const firstPublished = review.published_at;
    assert.equal((await get()).body.summary.count, 1);
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'approve' })).status, 409, 'approving twice is refused');

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'unpublish' })).status, 200);
    assert.equal(rows()[0].status, 'hidden');
    assert.equal((await get()).body.reviews.length, 0, 'hidden reviews leave the public site');
    assert.equal((await get()).body.summary.count, 0, 'and stop counting towards the rating');

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'publish' })).status, 200);
    [review] = rows();
    assert.equal(review.status, 'published');
    assert.equal(review.published_at, firstPublished, 'republishing keeps the original publication date');

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'reject' })).status, 200);
    assert.equal(rows()[0].status, 'rejected');
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'explode' })).status, 400);
    assert.equal((await owner('reviews/99999', 'PATCH', { action: 'approve' })).status, 404);

    const log = db.prepare("SELECT action, entity_id, user_id FROM admin_activity WHERE entity_type = 'review' ORDER BY rowid").all() as { action: string; entity_id: string; user_id: string }[];
    assert.deepEqual(log.map((entry) => entry.action), ['approve', 'unpublish', 'publish', 'reject']);
    assert.ok(log.every((entry) => entry.entity_id === String(id) && entry.user_id === 'user-owner'));
  });

  it('saves a translated reply that shows publicly, and removes it', async () => {
    const admin = await signIn('admin');
    const id = insertReview({ status: 'published' });
    const saved = await admin(`reviews/${id}`, 'PATCH', { reply: 'Thank you <b>so much</b>!' });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.translationFailed, false);
    const [review] = rows();
    assert.equal(review.admin_reply, 'Thank you so much!');
    assert.equal(review.admin_reply_he, 'HE:Thank you so much!');
    assert.equal(review.replied_by, 'user-admin');

    const publicReview = (await get()).body.reviews[0];
    assert.equal(publicReview.reply, 'Thank you so much!');
    assert.equal(publicReview.replyHe, 'HE:Thank you so much!');
    assert.ok(publicReview.repliedAt);

    assert.equal((await admin(`reviews/${id}`, 'PATCH', { reply: 'x'.repeat(2001) })).status, 400);
    assert.equal((await admin(`reviews/${id}`, 'PATCH', { reply: '' })).status, 200);
    const cleared = rows()[0];
    assert.equal(cleared.admin_reply, '');
    assert.equal(cleared.replied_at, null);
    const actions = (db.prepare("SELECT action FROM admin_activity WHERE entity_type = 'review' ORDER BY rowid").all() as { action: string }[]).map((entry) => entry.action);
    assert.deepEqual(actions, ['reply', 'remove_reply']);
  });

  it('keeps the English reply when translation is unavailable', async () => {
    const admin = await signIn('admin');
    env.AI = { run: async () => { throw new Error('AI down'); } };
    const id = insertReview({ status: 'published' });
    const result = await admin(`reviews/${id}`, 'PATCH', { reply: 'Thanks for staying with us.' });
    assert.equal(result.status, 200);
    assert.equal(result.body.translationFailed, true);
    assert.equal(rows()[0].admin_reply, 'Thanks for staying with us.');
    assert.equal(rows()[0].admin_reply_he, '');
  });

  it('deletes a review and logs it', async () => {
    const owner = await signIn('owner');
    const id = insertReview({ name: 'To delete' });
    assert.equal((await owner(`reviews/${id}`, 'DELETE')).status, 200);
    assert.equal(rows().length, 0);
    assert.equal((await owner(`reviews/${id}`, 'DELETE')).status, 404);
    const entry = db.prepare("SELECT action, details_json FROM admin_activity WHERE entity_type = 'review'").get() as { action: string; details_json: string };
    assert.equal(entry.action, 'delete');
    assert.equal(JSON.parse(entry.details_json).name, 'To delete');
  });

  it('shows the pending review count on the dashboard', async () => {
    const owner = await signIn('owner');
    insertReview();
    insertReview();
    insertReview({ status: 'published' });
    const dashboard = await owner('dashboard');
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.metrics.pendingReviews, 2);
  });
});
