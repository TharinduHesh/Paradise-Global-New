/**
 * Review submission, moderation and email-link moderation tests. Runs the real Pages Functions against an in-memory SQLite
 * database built from the real migrations, through a small D1-compatible adapter. External services (Turnstile, Resend,
 * Workers AI) are mocked.
 *
 *   npm run test:reviews
 */
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { onRequestGet, onRequestPost } from '../functions/api/reviews';
import { onRequestPost as moderationRequest } from '../functions/api/review-moderation';
import { onRequest as adminRequest } from '../functions/api/admin/[[path]]';
import { sha256 } from '../functions/_lib/admin';
import { REVIEW_EMAIL_SUBJECT } from '../functions/_lib/email';

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
  private raw: string;
  constructor(private db: DatabaseSync, sql: string, params: Value[] = []) {
    this.raw = sql;
    [this.sql, this.params] = expandNumbered(sql, params);
  }
  bind(...values: unknown[]) { return new Statement(this.db, this.raw, values.map((value) => (typeof value === 'boolean' ? Number(value) : value as Value))); }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...this.params) as T[] }; }
  async run() { return this.runSync(); }
  /** Shaped like a D1 result: { success, meta: { changes } }. */
  runSync() { const result = this.db.prepare(this.sql).run(...this.params); return { success: true, meta: { changes: Number(result.changes) } }; }
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
const RECIPIENT = 'manager@example.test';
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
    REVIEW_NOTIFICATION_EMAIL: RECIPIENT,
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

const validReview = { name: 'Anna Perera', email: 'Anna@Example.com', country: 'Sri Lanka', rating: 5, message: 'Excellent team, our villa was finished on time.' };

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
const moderate = async (body: unknown) => {
  const response = await moderationRequest({
    request: new Request(`${SITE}/api/review-moderation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    env: env as never,
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
};
const rows = () => db.prepare('SELECT * FROM customer_reviews ORDER BY id').all() as Record<string, any>[];
const tokenRows = () => db.prepare('SELECT * FROM review_moderation_tokens ORDER BY rowid').all() as Record<string, any>[];
const resendCalls = () => fetchCalls.filter((call) => call.url.includes('api.resend.com'));
const lastEmail = () => JSON.parse(String(resendCalls().at(-1)?.init?.body)) as { to: string[]; subject: string; html: string; text: string; reply_to?: string };
/** Submits a review and returns the one-time tokens from the email's approve/reject links. */
const submitAndGetTokens = async (review: Record<string, unknown> = validReview) => {
  assert.equal((await post(review)).status, 201);
  const { text } = lastEmail();
  const token = (label: string) => new RegExp(`${label}: ${SITE}/review-moderation#token=([0-9a-f]{64})`).exec(text)?.[1] ?? '';
  return { approve: token('Approve review'), reject: token('Reject review'), id: rows().at(-1)!.id as number };
};

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

/* ------------------------------------------------------------------ Migrations */

describe('migrations 0006 and 0007', () => {
  it('add the review tables without touching existing enquiries, testimonials or reviews', () => {
    const database = new DatabaseSync(':memory:');
    database.exec(contactTable);
    for (const file of migrations.filter((name) => name < '0006')) database.exec(readFileSync(join('migrations', file), 'utf8'));
    database.prepare("INSERT INTO contact_enquiries (name, email, phone, service, property_location, message) VALUES ('Old', 'old@example.com', '', '', '', 'Hello')").run();
    database.prepare(`INSERT INTO content_items (id, content_type, slug, title, data_json, is_published) VALUES ('t1', 'testimonial', 'jane', 'Jane', '{"quote":"Great"}', 1)`).run();
    database.exec(readFileSync(join('migrations', migrations.find((name) => name.startsWith('0006'))!), 'utf8'));
    database.prepare("INSERT INTO customer_reviews (name, email, service, rating, message, status) VALUES ('Kept', 'k@example.com', 'general', 5, 'Existing review', 'published')").run();
    database.exec(readFileSync(join('migrations', migrations.find((name) => name.startsWith('0007'))!), 'utf8'));
    assert.equal((database.prepare('SELECT COUNT(*) AS n FROM contact_enquiries').get() as { n: number }).n, 1);
    assert.equal((database.prepare("SELECT COUNT(*) AS n FROM content_items WHERE content_type = 'testimonial'").get() as { n: number }).n, 1);
    const kept = database.prepare('SELECT status, rejection_reason FROM customer_reviews').get() as { status: string; rejection_reason: string };
    assert.deepEqual({ ...kept }, { status: 'published', rejection_reason: '' });
    assert.throws(() => database.prepare("INSERT INTO customer_reviews (name, email, service, rating, message) VALUES ('a', 'b', 'general', 6, 'x')").run(), /CHECK/);
    assert.throws(() => database.prepare("INSERT INTO review_moderation_tokens (id, review_id, action, token_hash, recipient, expires_at) VALUES ('x', 1, 'publish', 'h', 'r', 'e')").run(), /CHECK/);
  });
});

/* ------------------------------------------------------------------ Public submission */

describe('POST /api/reviews', () => {
  it('saves a valid review as pending and emails the manager one-time approve/reject links', async () => {
    const result = await post(validReview);
    assert.equal(result.status, 201);
    const [saved] = rows();
    assert.equal(saved.status, 'pending');
    assert.equal(saved.email, 'anna@example.com');
    assert.equal(saved.service, '', 'the service question is no longer asked');
    assert.equal(saved.ip_hash, '', 'no visitor IP data is kept');

    assert.equal(resendCalls().length, 1);
    const email = lastEmail();
    assert.deepEqual(email.to, [RECIPIENT]);
    assert.equal(email.subject, REVIEW_EMAIL_SUBJECT);
    assert.equal(email.subject, 'New Customer Review – Approval Required | Paradise Global Leisures');
    assert.equal(email.reply_to, undefined);
    assert.equal(new Headers(resendCalls()[0].init?.headers).get('Idempotency-Key'), `review-${saved.id}-notification`);
    for (const part of ['Anna Perera', 'Sri Lanka', '★★★★★', 'Excellent team, our villa was finished on time.', 'Pending approval']) {
      assert.ok(email.text.includes(part), `the email includes "${part}"`);
    }
    assert.ok(!/service/i.test(email.text), 'the email does not mention a service');
    assert.ok(!email.text.includes('anna@example.com') && !email.html.includes('anna@example.com'), 'the customer email address is not in the email');
    for (const label of ['Approve Review', 'Reject Review', 'Open Manager Dashboard']) assert.ok(email.html.includes(label), `the email has a "${label}" button`);
    assert.ok(email.html.includes(`${SITE}/admin/reviews`));

    const links = [...email.text.matchAll(/review-moderation#token=([0-9a-f]{64})/g)].map((match) => match[1]);
    assert.equal(links.length, 2);
    assert.notEqual(links[0], links[1]);
    const stored = tokenRows();
    assert.deepEqual(stored.map((row) => row.action), ['approve', 'reject']);
    assert.ok(stored.every((row) => row.review_id === saved.id && row.recipient === RECIPIENT && row.used_at === null));
    assert.deepEqual(stored.map((row) => row.token_hash).sort(), (await Promise.all(links.map((token) => sha256(token)))).sort(), 'only hashes are stored');
    const dump = JSON.stringify(stored);
    assert.ok(links.every((token) => !dump.includes(token)), 'raw tokens are never stored');
    const hours = db.prepare("SELECT (julianday(expires_at) - julianday('now')) * 24 AS h FROM review_moderation_tokens LIMIT 1").get() as { h: number };
    assert.ok(hours.h > 47.9 && hours.h <= 48, 'links expire after 48 hours');

    const list = await get();
    assert.equal(list.body.reviews.length, 0);
    assert.equal(list.body.summary.count, 0);
  });

  it('falls back to ADMIN_EMAIL when REVIEW_NOTIFICATION_EMAIL is not set', async () => {
    delete env.REVIEW_NOTIFICATION_EMAIL;
    await post(validReview);
    assert.deepEqual(lastEmail().to, ['owner@example.test']);
    assert.equal(tokenRows()[0].recipient, 'owner@example.test');
  });

  it('rejects invalid input', async () => {
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ ...validReview, rating: 0 }, /rating/],
      [{ ...validReview, rating: 4.5 }, /rating/],
      [{ ...validReview, rating: '5' }, /rating/],
      [{ ...validReview, email: 'not-an-email' }, /email/],
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
    assert.ok(!lastEmail().html.includes('<script>'));
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

  it('does not limit how many reviews a visitor can send', async () => {
    for (let index = 0; index < 8; index += 1) {
      const result = await post({ ...validReview, message: `Review number ${index} with some detail.` });
      assert.equal(result.status, 201, `review ${index + 1} is accepted`);
    }
    assert.equal(rows().length, 8);
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
    insertReview({ name: 'Pub Four', email: 'four@private.test', rating: 4, status: 'published', service: '' });
    insertReview({ name: 'Pending One', rating: 1, status: 'pending' });
    insertReview({ name: 'Rejected One', rating: 1, status: 'rejected' });
    insertReview({ name: 'Hidden One', rating: 1, status: 'hidden' });

    const result = await get();
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.reviews.map((review: { name: string }) => review.name).sort(), ['Pub Five', 'Pub Four']);
    assert.deepEqual(result.body.summary, { count: 2, average: 4.5, breakdown: [0, 0, 0, 1, 1] });
    for (const secret of ['private.test', 'ip_hash', 'email', 'status', 'rejection', 'Pending One', 'Hidden One', 'Rejected One']) {
      assert.ok(!result.text.includes(secret), `response must not contain "${secret}"`);
    }
    assert.equal(result.body.reviews.find((review: { name: string }) => review.name === 'Pub Four').service, '');
    assert.equal(result.body.siteKey, null);
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

/* ------------------------------------------------------------------ Email-link moderation */

describe('email-link moderation', () => {
  it('previewing never changes the review (safe for email scanners)', async () => {
    const { approve, reject } = await submitAndGetTokens();
    for (let index = 0; index < 3; index += 1) {
      const preview = await moderate({ token: approve, step: 'preview' });
      assert.equal(preview.status, 200);
      assert.equal(preview.body.action, 'approve');
      assert.deepEqual(Object.keys(preview.body.review).sort(), ['country', 'message', 'name', 'rating', 'status', 'submittedAt']);
      assert.equal(preview.body.review.name, 'Anna Perera');
    }
    assert.equal((await moderate({ token: reject, step: 'preview' })).body.action, 'reject');
    assert.equal(rows()[0].status, 'pending');
    assert.ok(tokenRows().every((row) => row.used_at === null));
    assert.ok(!JSON.stringify((await moderate({ token: approve, step: 'preview' })).body).includes('anna@example.com'), 'no customer email in the preview');
  });

  it('approves and publishes once, then spends every link of the review', async () => {
    const { approve, reject, id } = await submitAndGetTokens();
    const done = await moderate({ token: approve, step: 'confirm', action: 'approve' });
    assert.equal(done.status, 200);
    assert.equal(done.body.status, 'published');
    const [review] = rows();
    assert.equal(review.status, 'published');
    assert.ok(review.published_at);
    assert.ok(tokenRows().every((row) => row.used_at !== null), 'both links are spent');

    const list = await get();
    assert.deepEqual(list.body.reviews.map((item: { id: number }) => item.id), [id], 'immediately public');
    assert.equal(list.body.summary.count, 1);

    const replay = await moderate({ token: approve, step: 'confirm', action: 'approve' });
    assert.equal(replay.status, 409, 'replaying the approval is refused');
    const otherLink = await moderate({ token: reject, step: 'confirm', action: 'reject' });
    assert.equal(otherLink.status, 409, 'the reject link no longer works');
    assert.equal(rows()[0].status, 'published');

    const log = db.prepare("SELECT action, user_id, details_json FROM admin_activity WHERE entity_type = 'review'").all() as { action: string; user_id: string | null; details_json: string }[];
    assert.equal(log.length, 1);
    assert.equal(log[0].action, 'approve');
    assert.equal(log[0].user_id, null);
    assert.equal(JSON.parse(log[0].details_json).via, 'email link');
  });

  it('rejects with an optional reason and keeps the review private', async () => {
    const { reject, approve } = await submitAndGetTokens();
    const done = await moderate({ token: reject, step: 'confirm', action: 'reject', reason: 'Contains <b>personal</b> details' });
    assert.equal(done.status, 200);
    assert.equal(done.body.status, 'rejected');
    const [review] = rows();
    assert.equal(review.status, 'rejected');
    assert.equal(review.rejection_reason, 'Contains personal details');
    assert.equal(review.published_at, null);
    assert.equal((await get()).body.reviews.length, 0);
    assert.equal((await moderate({ token: approve, step: 'confirm', action: 'approve' })).status, 409);
    assert.equal(rows()[0].status, 'rejected');
  });

  it('a link can only perform its own action', async () => {
    const { reject } = await submitAndGetTokens();
    assert.equal((await moderate({ token: reject, step: 'confirm', action: 'approve' })).status, 400);
    assert.equal(rows()[0].status, 'pending');
  });

  it('refuses unknown, malformed, expired and re-addressed links', async () => {
    const { approve, reject } = await submitAndGetTokens();
    assert.equal((await moderate({ token: 'a'.repeat(64), step: 'preview' })).status, 404);
    assert.equal((await moderate({ token: '1', step: 'preview' })).status, 404);
    assert.equal((await moderate({ token: `${approve}x`, step: 'confirm', action: 'approve' })).status, 404);
    assert.equal((await moderate({ token: approve.toUpperCase(), step: 'preview' })).status, 404);
    assert.equal((await moderate({ token: approve, step: 'delete' })).status, 400);
    assert.equal((await moderate({ token: approve, step: 'confirm', action: 'reject', reason: 'x'.repeat(501) })).status, 400);

    env.REVIEW_NOTIFICATION_EMAIL = 'someone-else@example.test';
    assert.equal((await moderate({ token: approve, step: 'confirm', action: 'approve' })).status, 404, 'links only work for the configured recipient');
    env.REVIEW_NOTIFICATION_EMAIL = RECIPIENT;

    db.prepare("UPDATE review_moderation_tokens SET expires_at = datetime('now', '-1 minute')").run();
    const expired = await moderate({ token: approve, step: 'confirm', action: 'approve' });
    assert.equal(expired.status, 410);
    assert.equal(expired.body.code, 'expired');
    assert.equal((await moderate({ token: reject, step: 'preview' })).status, 410);
    assert.equal(rows()[0].status, 'pending');
  });

  it('dashboard moderation spends the email links', async () => {
    const { approve } = await submitAndGetTokens();
    const admin = await signIn('admin');
    assert.equal((await admin(`reviews/${rows()[0].id}`, 'PATCH', { action: 'reject', reason: 'Spam' })).status, 200);
    assert.equal(rows()[0].rejection_reason, 'Spam');
    assert.ok(tokenRows().every((row) => row.used_at !== null));
    assert.equal((await moderate({ token: approve, step: 'confirm', action: 'approve' })).status, 409);
    assert.equal(rows()[0].status, 'rejected');
  });

  it('deleting a review removes its links', async () => {
    const { approve, id } = await submitAndGetTokens();
    const owner = await signIn('owner');
    assert.equal((await owner(`reviews/${id}`, 'DELETE')).status, 200);
    assert.equal(tokenRows().length, 0);
    assert.equal((await moderate({ token: approve, step: 'preview' })).status, 404);
  });
});

/* ------------------------------------------------------------------ Admin moderation */

describe('admin review management', () => {
  it('requires a signed-in Owner, Admin or Manager and the anti-CSRF token', async () => {
    const anonymous = await adminRequest({ request: new Request(`${SITE}/api/admin/reviews`), env: env as never });
    assert.equal(anonymous.status, 401);
    const id = insertReview();
    const editor = await signIn('editor');
    assert.equal((await editor('reviews')).status, 403, 'editors cannot list reviews');
    assert.equal((await editor(`reviews/${id}`, 'PATCH', { action: 'approve' })).status, 403, 'editors cannot moderate');
    const owner = await signIn('owner');
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'approve' }, { csrf: false })).status, 403);
    assert.equal(rows()[0].status, 'pending');
  });

  it('lets Managers moderate and reply, but not delete', async () => {
    const manager = await signIn('manager');
    const id = insertReview({ status: 'pending' });
    assert.equal((await manager('reviews')).status, 200);
    assert.equal((await manager(`reviews/${id}`, 'PATCH', { action: 'approve' })).status, 200);
    assert.equal((await manager(`reviews/${id}`, 'PATCH', { action: 'unpublish' })).status, 200);
    assert.equal((await manager(`reviews/${id}`, 'PATCH', { reply: 'Thank you!' })).status, 200);
    assert.equal(rows()[0].status, 'hidden');
    assert.equal((await manager(`reviews/${id}`, 'DELETE')).status, 403);
    assert.equal(rows().length, 1);
    assert.equal((await manager('dashboard')).status, 403, 'managers still cannot open the admin dashboard data');
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
    assert.ok(all.body.reviews[0].email, 'staff can see the private email');

    assert.deepEqual((await admin('reviews?status=pending')).body.reviews.map((r: { name: string }) => r.name), ['Alice']);
    assert.deepEqual((await admin('reviews?rating=5')).body.reviews.map((r: { name: string }) => r.name).sort(), ['Alice', 'Cara']);
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

  it('approves, hides, republishes and rejects with valid transitions only, logging each action', async () => {
    const owner = await signIn('owner');
    const id = insertReview({ name: 'Moderated', rating: 4 });

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'unpublish' })).status, 409, 'a pending review cannot be hidden');
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'approve' })).status, 200);
    let [review] = rows();
    assert.equal(review.status, 'published');
    const firstPublished = review.published_at;
    assert.equal((await get()).body.summary.count, 1);
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'approve' })).status, 409, 'approving twice is refused');

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'unpublish' })).status, 200);
    assert.equal(rows()[0].status, 'hidden');
    assert.equal((await get()).body.summary.count, 0, 'hidden reviews stop counting');

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'publish' })).status, 200);
    [review] = rows();
    assert.equal(review.status, 'published');
    assert.equal(review.published_at, firstPublished, 'republishing keeps the original publication date');

    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'reject' })).status, 200);
    assert.equal(rows()[0].status, 'rejected');
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'publish' })).status, 200);
    assert.equal(rows()[0].rejection_reason, '', 'publishing clears an old rejection reason');
    assert.equal((await owner(`reviews/${id}`, 'PATCH', { action: 'explode' })).status, 400);
    assert.equal((await owner('reviews/99999', 'PATCH', { action: 'approve' })).status, 404);

    const log = db.prepare("SELECT action, entity_id, user_id FROM admin_activity WHERE entity_type = 'review' ORDER BY rowid").all() as { action: string; entity_id: string; user_id: string }[];
    assert.deepEqual(log.map((entry) => entry.action), ['approve', 'unpublish', 'publish', 'reject', 'publish']);
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

    const publicReview = (await get()).body.reviews[0];
    assert.equal(publicReview.reply, 'Thank you so much!');
    assert.equal(publicReview.replyHe, 'HE:Thank you so much!');

    assert.equal((await admin(`reviews/${id}`, 'PATCH', { reply: 'x'.repeat(2001) })).status, 400);
    assert.equal((await admin(`reviews/${id}`, 'PATCH', { reply: '' })).status, 200);
    assert.equal(rows()[0].admin_reply, '');
  });

  it('keeps the English reply when translation is unavailable', async () => {
    const admin = await signIn('admin');
    env.AI = { run: async () => { throw new Error('AI down'); } };
    const id = insertReview({ status: 'published' });
    const result = await admin(`reviews/${id}`, 'PATCH', { reply: 'Thanks for staying with us.' });
    assert.equal(result.status, 200);
    assert.equal(result.body.translationFailed, true);
    assert.equal(rows()[0].admin_reply_he, '');
  });

  it('shows the pending review count on the dashboard', async () => {
    const owner = await signIn('owner');
    insertReview();
    insertReview();
    insertReview({ status: 'published' });
    assert.equal((await owner('dashboard')).body.metrics.pendingReviews, 2);
  });
});
