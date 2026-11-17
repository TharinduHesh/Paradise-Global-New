import {
  AdminContext, AdminEnv, AdminUser, clearSession, createSession, error, hashPassword, logActivity,
  randomId, readJson, verifyPassword, withAuth, json, cookie, SESSION_SECONDS,
} from '../../_lib/admin';

interface Body { email?: string; password?: string; name?: string; role?: AdminUser['role']; userId?: string; currentPassword?: string; newPassword?: string; }
interface SetupBody extends Body { setupToken?: string; }
interface ContentBody { id?: string; contentType?: string; slug?: string; title?: string; data?: Record<string, unknown>; sortOrder?: number; isPublished?: boolean; }

const route = (request: Request) => new URL(request.url).pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '') || 'me';
const rateKey = (request: Request) => request.headers.get('CF-Connecting-IP') ?? 'unknown';

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safeText = /^[\s\uFEFF]*[=+@\-＝＋＠－]/u.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

const login = async (context: AdminContext) => {
  const body = await readJson<Body>(context.request);
  if (!body?.email || !body.password) return error('Email and password are required.');
  const key = rateKey(context.request);
  const attempt = await context.env.DB.prepare('SELECT attempts, locked_until FROM admin_login_attempts WHERE key = ?').bind(key).first<{ attempts: number; locked_until: string | null }>();
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) return error('Too many login attempts. Try again later.', 429);
  const user = await context.env.DB.prepare('SELECT id, email, name, role, is_active, password_hash FROM admin_users WHERE email = ?').bind(body.email.trim()).first<AdminUser & { password_hash: string }>();
  if (!user || !user.is_active || !(await verifyPassword(body.password, user.password_hash))) {
    const attempts = (attempt?.attempts ?? 0) + 1;
    await context.env.DB.prepare(`INSERT INTO admin_login_attempts (key, attempts, locked_until) VALUES (?, ?, CASE WHEN ? >= 5 THEN datetime('now', '+15 minutes') ELSE NULL END)
      ON CONFLICT(key) DO UPDATE SET attempts = ?, locked_until = CASE WHEN ? >= 5 THEN datetime('now', '+15 minutes') ELSE locked_until END, updated_at = datetime('now')`)
      .bind(key, attempts, attempts, attempts, attempts).run();
    return error('Invalid email or password.', 401);
  }
  await context.env.DB.prepare('DELETE FROM admin_login_attempts WHERE key = ?').bind(key).run();
  const token = await createSession(context.env, user.id);
  await context.env.DB.prepare('UPDATE admin_users SET last_login_at = datetime("now") WHERE id = ?').bind(user.id).run();
  await logActivity(context.env, user.id, 'login', 'session');
  return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { headers: { 'Set-Cookie': cookie(token, SESSION_SECONDS) } });
};

const setup = async (context: AdminContext) => {
  const body = await readJson<SetupBody>(context.request);
  const setupToken = context.env.OWNER_SETUP_TOKEN;
  if (!setupToken || body?.setupToken !== setupToken) return error('A valid Owner setup token is required.', 403);
  if (!body.email?.trim() || !body.password || !body.name?.trim() || body.password.length < 12) {
    return error('Name, email, and a password of at least 12 characters are required.');
  }
  const userId = randomId();
  const email = body.email.trim();
  const name = body.name.trim();
  const owner = await context.env.DB.prepare(`
    INSERT INTO admin_users (id, email, name, password_hash, role)
    SELECT ?, ?, ?, ?, 'owner' WHERE NOT EXISTS (SELECT 1 FROM admin_users)
    RETURNING id
  `).bind(userId, email, name, await hashPassword(body.password)).first<{ id: string }>();
  if (!owner) return error('Owner setup is already complete.', 409);
  const token = await createSession(context.env, userId);
  await logActivity(context.env, userId, 'setup_owner', 'user', userId);
  return json({ user: { id: userId, email, name, role: 'owner' } }, { status: 201, headers: { 'Set-Cookie': cookie(token, SESSION_SECONDS) } });
};

export const onRequest = async (context: { request: Request; env: AdminEnv }) => {
  const admin: AdminContext = context;
  const path = route(context.request);
  try {
    if (path === 'login' && context.request.method === 'POST') return await login(admin);
    if (path === 'setup' && context.request.method === 'POST') return await setup(admin);
    if (path === 'logout' && context.request.method === 'POST') return new Response(null, { status: 204, headers: await clearSession(context.env, context.request) });
    const auth = await withAuth(admin);
    if (auth.response) return auth.response;
    const user = auth.user;

    if (path === 'me' && context.request.method === 'GET') return json({ user });
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
    if (path === 'enquiries' && context.request.method === 'GET') {
      const url = new URL(context.request.url); const search = `%${url.searchParams.get('search') ?? ''}%`; const status = url.searchParams.get('status') ?? '';
      const result = await context.env.DB.prepare(`SELECT * FROM contact_enquiries WHERE (name LIKE ? OR email LIKE ? OR service LIKE ?) AND (? = '' OR status = ?) ORDER BY created_at DESC LIMIT 50`)
        .bind(search, search, search, status, status).all();
      if (url.searchParams.get('format') === 'csv') {
        const fields = ['id', 'name', 'email', 'phone', 'service', 'property_location', 'message', 'status', 'created_at'];
        const csv = [fields.join(','), ...result.results.map((row) => fields.map((field) => csvCell((row as Record<string, unknown>)[field])).join(','))].join('\n');
        return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="contact-enquiries.csv"' } });
      }
      return json({ enquiries: result.results });
    }
    if (path.startsWith('enquiries/') && context.request.method === 'PATCH') {
      const id = path.split('/')[1]; const body = await readJson<{ status?: string; note?: string }>(context.request);
      if (!body?.status || !['new', 'in_progress', 'resolved', 'archived'].includes(body.status)) return error('Invalid enquiry status.');
      await context.env.DB.prepare('UPDATE contact_enquiries SET status = ? WHERE id = ?').bind(body.status, id).run();
      if (body.note?.trim()) await context.env.DB.prepare('INSERT INTO enquiry_notes (id, enquiry_id, note, created_by) VALUES (?, ?, ?, ?)').bind(randomId(), id, body.note.trim(), user.id).run();
      await logActivity(context.env, user.id, 'update', 'enquiry', id, { status: body.status });
      return json({ ok: true });
    }
    if (path === 'content' && context.request.method === 'GET') {
      const type = new URL(context.request.url).searchParams.get('type') ?? '';
      const result = await context.env.DB.prepare('SELECT * FROM content_items WHERE (? = "" OR content_type = ?) ORDER BY content_type, sort_order, updated_at DESC').bind(type, type).all();
      return json({ items: result.results });
    }
    if (path === 'content' && context.request.method === 'POST') {
      if (!['owner', 'admin', 'editor'].includes(user.role)) return error('Forbidden.', 403);
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
      if (!['owner', 'admin'].includes(user.role)) return error('Only Owners and Admins can delete content.', 403);
      const id = path.split('/')[1];
      const existing = await context.env.DB.prepare('SELECT content_type, slug FROM content_items WHERE id = ?').bind(id).first<{ content_type: string; slug: string }>();
      if (!existing) return error('Content item not found.', 404);
      await context.env.DB.prepare('DELETE FROM content_items WHERE id = ?').bind(id).run();
      await logActivity(context.env, user.id, 'delete', 'content', id, { type: existing.content_type, slug: existing.slug });
      return json({ ok: true });
    }
    if (path === 'content/publish' && context.request.method === 'POST') {
      if (!['owner', 'admin'].includes(user.role)) return error('Only Owners and Admins can publish content.', 403);
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
      if (body.key === 'maintenance' && user.role !== 'owner') return error('Only the Owner can change maintenance mode.', 403);
      await context.env.DB.prepare('INSERT INTO site_settings (key, value_json, updated_by, updated_at) VALUES (?, ?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value_json = ?, updated_by = ?, updated_at = datetime("now")')
        .bind(body.key, JSON.stringify(body.value), user.id, JSON.stringify(body.value), user.id).run();
      await logActivity(context.env, user.id, 'update', 'setting', body.key);
      return json({ ok: true });
    }
    if (path === 'users' && context.request.method === 'GET') {
      if (user.role !== 'owner') return error('Owner access required.', 403);
      const result = await context.env.DB.prepare('SELECT id, email, name, role, is_active, created_at, last_login_at FROM admin_users ORDER BY created_at DESC').all();
      return json({ users: result.results });
    }
    if (path === 'users' && context.request.method === 'POST') {
      if (user.role !== 'owner') return error('Owner access required.', 403);
      const body = await readJson<Body>(context.request);
      if (!body?.email || !body.name || !body.role || !body.password || body.password.length < 12) return error('Name, email, role, and a 12-character password are required.');
      const id = randomId();
      await context.env.DB.prepare('INSERT INTO admin_users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)').bind(id, body.email.trim(), body.name.trim(), await hashPassword(body.password), body.role).run();
      await logActivity(context.env, user.id, 'create', 'user', id, { role: body.role });
      return json({ id }, { status: 201 });
    }
    if (path.startsWith('users/') && context.request.method === 'PATCH') {
      if (user.role !== 'owner') return error('Owner access required.', 403);
      const id = path.split('/')[1]; const body = await readJson<{ role?: AdminUser['role']; isActive?: boolean }>(context.request);
      if (id === user.id && body?.isActive === false) return error('You cannot deactivate your own account.');
      if (body?.isActive === false) {
        const owners = await context.env.DB.prepare(`SELECT COUNT(*) AS count FROM admin_users WHERE role = 'owner' AND is_active = 1`).first<{ count: number }>();
        const target = await context.env.DB.prepare('SELECT role FROM admin_users WHERE id = ?').bind(id).first<{ role: string }>();
        if (target?.role === 'owner' && (owners?.count ?? 0) <= 1) return error('The last active Owner cannot be deactivated.');
      }
      await context.env.DB.prepare('UPDATE admin_users SET role = COALESCE(?, role), is_active = COALESCE(?, is_active), updated_at = datetime("now") WHERE id = ?')
        .bind(body?.role ?? null, typeof body?.isActive === 'boolean' ? (body.isActive ? 1 : 0) : null, id).run();
      if (body?.isActive === false) await context.env.DB.prepare('DELETE FROM admin_sessions WHERE user_id = ?').bind(id).run();
      await logActivity(context.env, user.id, 'update', 'user', id, body ?? {});
      return json({ ok: true });
    }
    if (path === 'password' && context.request.method === 'POST') {
      const body = await readJson<Body>(context.request);
      const current = await context.env.DB.prepare('SELECT password_hash FROM admin_users WHERE id = ?').bind(user.id).first<{ password_hash: string }>();
      if (!body?.currentPassword || !body.newPassword || body.newPassword.length < 12 || !current || !(await verifyPassword(body.currentPassword, current.password_hash))) return error('Current password is incorrect or the new password is too short.');
      await context.env.DB.prepare('UPDATE admin_users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').bind(await hashPassword(body.newPassword), user.id).run();
      await context.env.DB.prepare('DELETE FROM admin_sessions WHERE user_id = ?').bind(user.id).run();
      await logActivity(context.env, user.id, 'change_password', 'user', user.id);
      return new Response(null, { status: 204, headers: await clearSession(context.env, context.request) });
    }
    if (path === 'activity' && context.request.method === 'GET') {
      if (!['owner', 'admin'].includes(user.role)) return error('Admin access required.', 403);
      const result = await context.env.DB.prepare('SELECT a.*, u.name AS user_name FROM admin_activity a LEFT JOIN admin_users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 100').all();
      return json({ activity: result.results });
    }
    return error('Admin route not found.', 404);
  } catch (caught) {
    console.error('Admin API error:', caught);
    return error('Unable to complete admin request.', 500);
  }
};
