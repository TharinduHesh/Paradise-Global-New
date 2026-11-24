import { canReadStaffSection, isAdministrator } from '../../../src/lib/adminAccess';
import { enquiryCategories, enquiryCategorySql } from '../../../src/lib/enquiryCategories';
import { builtInContent, importedContentSettingKey } from '../../../src/lib/builtInContent';
import { passwordProblem } from '../../../src/lib/passwordPolicy';
import { manageAccounts } from '../../_lib/adminAccounts';
import { validateTurnstile } from '../../_lib/turnstile';
import { createLoginChallenge, openLoginEnvelope } from '../../_lib/loginEnvelope';
import {
  AdminContext, AdminEnv, AdminUser, clearSession, createSession, csrfTokenFor, error, getCookie, hashPassword, hasValidCsrfToken, logActivity,
  randomId, readJson, sha256, verifyPassword, withAuth, json, cookie, SESSION_COOKIE, SESSION_SECONDS,
} from '../../_lib/admin';

interface Body { email?: string; password?: string; name?: string; role?: AdminUser['role']; userId?: string; currentPassword?: string; newPassword?: string; }
interface SetupBody extends Body { setupToken?: string; }
interface ContentBody { id?: string; contentType?: string; slug?: string; title?: string; data?: Record<string, unknown>; sortOrder?: number; isPublished?: boolean; }

/** Copies the website's built-in records for a type into the catalogue once, so they can be edited or deleted like any other record. */
const importBuiltInContent = async (context: AdminContext, userId: string, type: string) => {
  const items = builtInContent[type];
  if (!items?.length) return;
  const setting = await context.env.DB.prepare('SELECT value_json FROM site_settings WHERE key = ?').bind(importedContentSettingKey).first<{ value_json: string }>();
  const imported = setting ? JSON.parse(setting.value_json) as string[] : [];
  if (imported.includes(type)) return;
  const statements = items.map((item, index) => context.env.DB.prepare(`INSERT OR IGNORE INTO content_items (id, content_type, slug, title, data_json, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?, ?, 1)`).bind(randomId(), type, item.slug, item.title, JSON.stringify(item.data), index + 1));
  statements.push(context.env.DB.prepare(`INSERT INTO site_settings (key, value_json, updated_by) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = datetime('now')`)
    .bind(importedContentSettingKey, JSON.stringify([...imported, type]), userId));
  await context.env.DB.batch(statements);
  await logActivity(context.env, userId, 'import', 'content', undefined, { type, count: items.length });
};

const route = (request: Request) => new URL(request.url).pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '') || 'me';
const rateKey = (request: Request) => request.headers.get('CF-Connecting-IP') ?? 'unknown';

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safeText = /^[\s\uFEFF]*[=+@\-\uFF1D\uFF0B\uFF20\uFF0D]/u.test(text) ? "'" + text : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

// Failed sign-ins are counted per IP address and per account; reaching a limit locks that key for 15 minutes.
const IP_ATTEMPT_LIMIT = 5;
const ACCOUNT_ATTEMPT_LIMIT = 10;
// Checked when the email is unknown so that a missing account takes as long to reject as a wrong password.
const DUMMY_PASSWORD_HASH = `pbkdf2$100000$${'0'.repeat(32)}$${'0'.repeat(64)}`;

const isLocked = async (env: AdminEnv, key: string) => Boolean(await env.DB.prepare(
  `SELECT 1 FROM admin_login_attempts WHERE key = ? AND locked_until > datetime('now')`,
).bind(key).first());

/** Counts a failure (the count restarts after 15 quiet minutes) and reports whether the key is now locked. */
const recordFailure = async (env: AdminEnv, key: string, limit: number) => {
  const row = await env.DB.prepare(`INSERT INTO admin_login_attempts (key, attempts, locked_until, updated_at)
    VALUES (?1, 1, CASE WHEN 1 >= ?2 THEN datetime('now', '+15 minutes') END, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      attempts = CASE WHEN updated_at < datetime('now', '-15 minutes') THEN 1 ELSE attempts + 1 END,
      locked_until = CASE WHEN (CASE WHEN updated_at < datetime('now', '-15 minutes') THEN 1 ELSE attempts + 1 END) >= ?2
        THEN datetime('now', '+15 minutes') ELSE locked_until END,
      updated_at = datetime('now')
    RETURNING attempts`).bind(key, limit).first<{ attempts: number }>();
  return (row?.attempts ?? 0) === limit;
};

const login = async (context: AdminContext) => {
  // The sign-in fields only arrive encrypted (see src/lib/loginEnvelope.ts); a plain JSON body is refused.
  const body = await openLoginEnvelope<Body & { turnstileToken?: unknown }>(context.env, context.request);
  if (!body) return error('Your sign-in request expired. Please try again.', 400);
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password
    || body.email.length > 254 || body.password.length > 256) return error('Email and password are required.');
  const secret = context.env.TURNSTILE_SECRET_KEY;
  if (secret && !await validateTurnstile(context.request, secret, body.turnstileToken, 'admin_login')) {
    return error('Please complete the security check and try again.', 403);
  }
  const email = body.email.trim();
  const ipKey = `ip:${rateKey(context.request)}`;
  const accountKey = `account:${await sha256(email.toLowerCase())}`;
  if (await isLocked(context.env, ipKey) || await isLocked(context.env, accountKey)) return error('Too many login attempts. Try again later.', 429);
  const user = await context.env.DB.prepare('SELECT id, email, name, is_active, password_hash FROM admin_users WHERE email = ? AND deleted_at IS NULL')
    .bind(email).first<{ id: string; email: string; name: string; is_active: number; password_hash: string }>();
  const passwordMatches = await verifyPassword(body.password, user?.password_hash || DUMMY_PASSWORD_HASH);
  if (!user || !user.is_active || !passwordMatches) {
    const [, accountLocked] = await Promise.all([
      recordFailure(context.env, ipKey, IP_ATTEMPT_LIMIT),
      recordFailure(context.env, accountKey, ACCOUNT_ATTEMPT_LIMIT),
    ]);
    // Shows in the Activity log so administrators can see an account under attack.
    if (accountLocked && user) await logActivity(context.env, undefined, 'login_locked', 'user', user.id, { failedAttempts: ACCOUNT_ATTEMPT_LIMIT });
    return error('Invalid email or password.', 401);
  }
  // PGL-001: a correct password that fails the current policy (such as "CompanyName@Admin123") cannot be used to sign in.
  // The person must choose a strong new password in the same step; no session is created until they do.
  if (passwordProblem(body.password, user)) {
    const changeRequired = (message: string, status: number) => json({ error: message, code: 'password_change_required' }, { status });
    if (typeof body.newPassword !== 'string' || !body.newPassword) {
      return changeRequired('Your password no longer meets the security policy. Choose a new password to continue.', 403);
    }
    const weakNewPassword = passwordProblem(body.newPassword, user);
    if (weakNewPassword) return changeRequired(weakNewPassword, 400);
    if (body.newPassword === body.password) return changeRequired('Choose a new password that is different from the current one.', 400);
    await context.env.DB.batch([
      context.env.DB.prepare('UPDATE admin_users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').bind(await hashPassword(body.newPassword), user.id),
      context.env.DB.prepare('DELETE FROM admin_sessions WHERE user_id = ?').bind(user.id),
    ]);
    await logActivity(context.env, user.id, 'replace_weak_password', 'user', user.id);
  }
  await context.env.DB.batch([ipKey, accountKey].map((key) => context.env.DB.prepare('DELETE FROM admin_login_attempts WHERE key = ?').bind(key)));
  const token = await createSession(context.env, user.id);
  await context.env.DB.prepare('UPDATE admin_users SET last_login_at = datetime("now") WHERE id = ?').bind(user.id).run();
  await logActivity(context.env, user.id, 'login', 'session');
  // The signed-in user's details are fetched afterwards from /api/admin/me.
  return json({ ok: true }, { headers: { 'Set-Cookie': cookie(token, SESSION_SECONDS) } });
};

const setup = async (context: AdminContext) => {
  const body = await openLoginEnvelope<SetupBody>(context.env, context.request);
  if (!body) return error('Your setup request expired. Please try again.', 400);
  const setupToken = context.env.OWNER_SETUP_TOKEN;
  if (!setupToken || body.setupToken !== setupToken) return error('A valid Owner setup token is required.', 403);
  if (!body.email?.trim() || !body.name?.trim()) return error('Name and email are required.');
  const userId = randomId();
  const email = body.email.trim();
  const name = body.name.trim();
  const weakPassword = passwordProblem(body.password, { email, name });
  if (weakPassword) return error(weakPassword);
  const owner = await context.env.DB.prepare(`
    INSERT INTO admin_users (id, email, name, password_hash, role)
    SELECT ?, ?, ?, ?, 'owner' WHERE NOT EXISTS (SELECT 1 FROM admin_users)
    RETURNING id
  `).bind(userId, email, name, await hashPassword(body.password as string)).first<{ id: string }>();
  if (!owner) return error('Owner setup is already complete.', 409);
  const token = await createSession(context.env, userId);
  await logActivity(context.env, userId, 'setup_owner', 'user', userId);
  return json({ ok: true }, { status: 201, headers: { 'Set-Cookie': cookie(token, SESSION_SECONDS) } });
};

export const onRequest = async (context: { request: Request; env: AdminEnv }) => {
  const admin: AdminContext = context;
  const path = route(context.request);
  try {
    if (path === 'login-challenge' && context.request.method === 'GET') return json(await createLoginChallenge(context.env));
    if (path === 'login' && context.request.method === 'POST') return await login(admin);
    if (path === 'setup' && context.request.method === 'POST') return await setup(admin);
    const invalidCsrf = () => error('Your security token is missing or out of date. Refresh the page and try again.', 403);
    if (path === 'logout' && context.request.method === 'POST') {
      if (getCookie(context.request, SESSION_COOKIE) && !await hasValidCsrfToken(context.request)) return invalidCsrf();
      return new Response(null, { status: 204, headers: await clearSession(context.env, context.request) });
    }
    const auth = await withAuth(admin);
    if (auth.response) return auth.response;
    const user = auth.user;
    const method = context.request.method;
    // Every state-changing request from a signed-in user must carry the session's anti-CSRF token.
    if (!['GET', 'HEAD'].includes(method) && !await hasValidCsrfToken(context.request)) return invalidCsrf();
    const adminAccess = isAdministrator(user.role);
    const enquiry = /^enquiries\/(\d+)$/.exec(path);
    if (path === 'me' && method === 'GET') return json({ user, csrfToken: await csrfTokenFor(context.request) });
    if (/^users(?:\/[^/]+(?:\/password)?)?$/.test(path)) return await manageAccounts(context.env, context.request, user, path);
    const staffRead = method === 'GET' && (
      ((path === 'enquiries' || enquiry) && canReadStaffSection(user, 'enquiries'))
      || (path === 'activity' && canReadStaffSection(user, 'activity'))
    );
    if (!adminAccess && !staffRead && !(path === 'password' && method === 'POST')) {
      return error('You do not have permission for this action.', 403);
    }

    if (path === 'dashboard' && context.request.method === 'GET') {
      const [enquiries, published, users, activity, maintenance] = await Promise.all([
        context.env.DB.prepare(`SELECT COUNT(*) AS count FROM contact_enquiries WHERE status = 'new'`).first(),
        context.env.DB.prepare('SELECT COUNT(*) AS count FROM content_items WHERE is_published = 1').first(),
        context.env.DB.prepare('SELECT COUNT(*) AS count FROM admin_users WHERE is_active = 1').first(),
        context.env.DB.prepare(`SELECT a.*, u.name AS user_name FROM admin_activity a LEFT JOIN admin_users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 8`).all(),
        context.env.DB.prepare(`SELECT value_json FROM site_settings WHERE key = 'maintenance'`).first<{ value_json: string }>(),
      ]);
      return json({ metrics: { newEnquiries: enquiries?.count ?? 0, publishedContent: published?.count ?? 0, activeUsers: users?.count ?? 0, maintenance: maintenance ? JSON.parse(maintenance.value_json) : { enabled: false } }, activity: activity.results });
    }
    if (path === 'enquiries' && method === 'GET') {
      const params = new URL(context.request.url).searchParams;
      const csvExport = params.get('format') === 'csv';
      if (csvExport && !adminAccess) return error('Enquiry export requires Admin access.', 403);
      const search = `%${params.get('search') ?? ''}%`;
      const status = params.get('status') ?? '';
      const category = params.get('category') ?? '';
      if (category && !Object.hasOwn(enquiryCategories, category)) return error('Invalid enquiry category.');
      const page = Math.max(1, Math.min(1000000, Number.parseInt(params.get('page') ?? '1', 10) || 1));
      const filter = `WHERE (e.name LIKE ? OR e.email LIKE ? OR e.service LIKE ?)
        AND (? = '' OR e.status = ?) AND (? = '' OR (${enquiryCategorySql}) = ?)`;
      const values = [search, search, search, status, status, category, category];
      const select = `SELECT e.*, (${enquiryCategorySql}) AS category, u.name AS assignee
        FROM contact_enquiries e LEFT JOIN admin_users u ON u.id = e.assigned_to ${filter}
        ORDER BY e.created_at DESC, e.id DESC`;
      if (csvExport) {
        const result = await context.env.DB.prepare(select).bind(...values).all();
        const fields = ['id', 'category', 'name', 'email', 'phone', 'service', 'property_location', 'message', 'status', 'assignee', 'created_at'];
        const csv = [fields.join(','), ...result.results.map((row) => fields.map((field) => csvCell(row[field])).join(','))].join('\n');
        return new Response(csv, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="contact-enquiries.csv"' } });
      }
      const result = await context.env.DB.prepare(select + ' LIMIT 51 OFFSET ?').bind(...values, (page - 1) * 50).all();
      return json({ enquiries: result.results.slice(0, 50), hasMore: result.results.length > 50 });
    }
    if (path === 'enquiry-assignees' && method === 'GET') {
      const result = await context.env.DB.prepare('SELECT id, name FROM admin_users WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name').all();
      return json({ users: result.results });
    }
    if (enquiry && method === 'GET') {
      const notes = await context.env.DB.prepare(`SELECT n.id, n.note, n.created_at, u.name AS author
        FROM enquiry_notes n LEFT JOIN admin_users u ON u.id = n.created_by
        WHERE n.enquiry_id = ? ORDER BY n.created_at, n.id`).bind(enquiry[1]).all();
      return json({ notes: notes.results });
    }
    if (enquiry && method === 'DELETE') {
      const id = enquiry[1];
      const existing = await context.env.DB.prepare('SELECT name, email FROM contact_enquiries WHERE id = ?').bind(id).first<{ name: string; email: string }>();
      if (!existing) return error('Enquiry not found.', 404);
      await context.env.DB.batch([
        context.env.DB.prepare('DELETE FROM enquiry_notes WHERE enquiry_id = ?').bind(id),
        context.env.DB.prepare('DELETE FROM contact_enquiries WHERE id = ?').bind(id),
      ]);
      await logActivity(context.env, user.id, 'delete', 'enquiry', id, { name: existing.name });
      return json({ ok: true });
    }
    if (enquiry && method === 'PATCH') {
      const id = enquiry[1];
      const body = await readJson<{ status?: string; note?: string; assignedTo?: string | null }>(context.request);
      if (!body || typeof body !== 'object' || Array.isArray(body) || (body.status !== undefined && !['new', 'in_progress', 'resolved', 'archived'].includes(body.status))
        || (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 4000))) return error('Invalid enquiry changes.');
      if (body.assignedTo !== undefined && body.assignedTo !== null) {
        if (typeof body.assignedTo !== 'string') return error('Invalid assignee.');
        const staff = await context.env.DB.prepare('SELECT id FROM admin_users WHERE id = ? AND is_active = 1 AND deleted_at IS NULL').bind(body.assignedTo).first();
        if (!staff) return error('Select an active assignee.');
      }
      if (!await context.env.DB.prepare('SELECT id FROM contact_enquiries WHERE id = ?').bind(id).first()) return error('Enquiry not found.', 404);
      const note = body.note?.trim();
      const statements = [context.env.DB.prepare(`UPDATE contact_enquiries SET status = COALESCE(?, status),
        assigned_to = CASE WHEN ? THEN ? ELSE assigned_to END WHERE id = ?`)
        .bind(body.status ?? null, Number(body.assignedTo !== undefined), body.assignedTo ?? null, id)];
      if (note) statements.push(context.env.DB.prepare('INSERT INTO enquiry_notes (id, enquiry_id, note, created_by) VALUES (?, ?, ?, ?)')
        .bind(randomId(), id, note, user.id));
      statements.push(context.env.DB.prepare(`INSERT INTO admin_activity (id, user_id, action, entity_type, entity_id, details_json)
        VALUES (?, ?, 'update', 'enquiry', ?, ?)`).bind(randomId(), user.id, id, JSON.stringify({ status: body.status, assignedTo: body.assignedTo, addedNote: Boolean(note) })));
      await context.env.DB.batch(statements);
      return json({ ok: true });
    }
    if (path === 'content' && context.request.method === 'GET') {
      const type = new URL(context.request.url).searchParams.get('type') ?? '';
      // A failed import must not hide the catalogue; it is retried on the next visit.
      await importBuiltInContent(context, user.id, type).catch((reason) => console.error('Unable to import built-in content:', reason));
      const result = await context.env.DB.prepare('SELECT * FROM content_items WHERE (? = "" OR content_type = ?) ORDER BY content_type, sort_order, updated_at DESC').bind(type, type).all();
      return json({ items: result.results });
    }
    if (path === 'content' && context.request.method === 'POST') {
      const body = await readJson<ContentBody>(context.request);
      if (!body?.contentType || !body.slug || !body.title || !body.data) return error('Content type, slug, title, and data are required.');
      const id = body.id ?? randomId();
      await context.env.DB.prepare(`INSERT INTO content_items (id, content_type, slug, title, data_json, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET content_type = ?, slug = ?, title = ?, data_json = ?, sort_order = ?, is_published = ?, updated_at = datetime('now')`)
        .bind(id, body.contentType, body.slug, body.title, JSON.stringify(body.data), body.sortOrder ?? 0, body.isPublished ? 1 : 0, body.contentType, body.slug, body.title, JSON.stringify(body.data), body.sortOrder ?? 0, body.isPublished ? 1 : 0).run();
      await logActivity(context.env, user.id, body.id ? 'update' : 'create', 'content', id, { type: body.contentType });
      return json({ id });
    }
    if (path.startsWith('content/') && context.request.method === 'DELETE') {
      const id = path.split('/')[1];
      const existing = await context.env.DB.prepare('SELECT content_type, slug FROM content_items WHERE id = ?').bind(id).first<{ content_type: string; slug: string }>();
      if (!existing) return error('Content item not found.', 404);
      await context.env.DB.prepare('DELETE FROM content_items WHERE id = ?').bind(id).run();
      await logActivity(context.env, user.id, 'delete', 'content', id, { type: existing.content_type, slug: existing.slug });
      return json({ ok: true });
    }
    if (path === 'content/reorder' && context.request.method === 'POST') {
      const body = await readJson<{ contentType?: string; ids?: string[] }>(context.request);
      if (!body?.contentType || !Array.isArray(body.ids) || !body.ids.length || body.ids.some((id) => typeof id !== 'string')) return error('Content type and ordered ids are required.');
      await context.env.DB.batch(body.ids.map((id, index) => context.env.DB.prepare('UPDATE content_items SET sort_order = ?, updated_at = datetime("now") WHERE id = ? AND content_type = ?').bind(index + 1, id, body.contentType)));
      await logActivity(context.env, user.id, 'reorder', 'content', undefined, { type: body.contentType });
      return json({ ok: true });
    }
    if (path === 'content/publish' && context.request.method === 'POST') {
      const body = await readJson<{ id: string; published: boolean }>(context.request);
      if (!body?.id) return error('Content id is required.');
      await context.env.DB.prepare('UPDATE content_items SET is_published = ?, updated_at = datetime("now") WHERE id = ?').bind(body.published ? 1 : 0, body.id).run();
      await logActivity(context.env, user.id, body.published ? 'publish' : 'unpublish', 'content', body.id);
      return json({ ok: true });
    }
    if (path === 'settings' && context.request.method === 'GET') {
      const rows = await context.env.DB.prepare('SELECT key, value_json FROM site_settings').all<{ key: string; value_json: string }>();
      return json({ settings: Object.fromEntries(rows.results.map((row) => [row.key, JSON.parse(row.value_json)])) });
    }
    if (path === 'settings' && context.request.method === 'POST') {
      const body = await readJson<{ key: string; value: unknown }>(context.request);
      if (!body?.key) return error('Setting key is required.');
      if (!['company', 'appearance', 'seo', 'maintenance'].includes(body.key) || !body.value || typeof body.value !== 'object' || Array.isArray(body.value)) return error('Invalid settings.');
      if (body.key === 'seo') {
        const seo = body.value as { title?: unknown; description?: unknown };
        if (typeof seo.title !== 'string' || seo.title.length > 120
          || typeof seo.description !== 'string' || seo.description.length > 320) return error('Invalid SEO settings.');
      }
      if (body.key === 'company') {
        const company = body.value as Record<string, unknown>;
        const allowed = ['name', 'phone', 'whatsapp', 'email', 'address', 'hours', 'facebook', 'instagram'];
        if (Object.entries(company).some(([key, value]) => !allowed.includes(key) || typeof value !== 'string' || value.length > 300)) return error('Invalid business information.');
        if (['facebook', 'instagram'].some((key) => company[key] && !/^https:\/\/\S+$/i.test(String(company[key])))) return error('Social media links must start with https://');
        if (company.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(company.email))) return error('Enter a valid email address.');
      }
      const maintenance = body.key === 'maintenance' ? body.value as { enabled?: unknown } : null;
      if (maintenance && typeof maintenance.enabled !== 'boolean') return error('Invalid maintenance state.');
      const write = context.env.DB.prepare('INSERT INTO site_settings (key, value_json, updated_by, updated_at) VALUES (?, ?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value_json = ?, updated_by = ?, updated_at = datetime("now")')
        .bind(body.key, JSON.stringify(body.value), user.id, JSON.stringify(body.value), user.id);
      await context.env.DB.batch([write, context.env.DB.prepare(`INSERT INTO admin_activity
        (id, user_id, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, 'setting', ?, ?)`)
        .bind(randomId(), user.id, maintenance ? 'update_maintenance' : 'update', body.key, JSON.stringify(maintenance ? { enabled: maintenance.enabled } : {}))]);
      return json({ ok: true });
    }
    if (path === 'password' && context.request.method === 'POST') {
      const body = await readJson<Body>(context.request);
      const current = await context.env.DB.prepare('SELECT password_hash FROM admin_users WHERE id = ?').bind(user.id).first<{ password_hash: string }>();
      if (!body?.currentPassword || !current || !(await verifyPassword(body.currentPassword, current.password_hash))) return error('Current password is incorrect.');
      const weakPassword = passwordProblem(body.newPassword, user);
      if (weakPassword || typeof body.newPassword !== 'string') return error(weakPassword ?? 'A new password is required.');
      if (body.newPassword === body.currentPassword) return error('Choose a new password that is different from the current one.');
      await context.env.DB.prepare('UPDATE admin_users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').bind(await hashPassword(body.newPassword), user.id).run();
      await context.env.DB.prepare('DELETE FROM admin_sessions WHERE user_id = ?').bind(user.id).run();
      await logActivity(context.env, user.id, 'change_password', 'user', user.id);
      return new Response(null, { status: 204, headers: await clearSession(context.env, context.request) });
    }
    if (path === 'activity' && context.request.method === 'GET') {
      const result = await context.env.DB.prepare('SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.created_at, u.name AS user_name FROM admin_activity a LEFT JOIN admin_users u ON u.id = a.user_id ORDER BY a.created_at DESC, a.id DESC LIMIT 100').all();
      return json({ activity: result.results });
    }
    return error('Admin route not found.', 404);
  } catch (caught) {
    console.error('Admin API error:', caught);
    return error('Unable to complete admin request.', 500);
  }
};
