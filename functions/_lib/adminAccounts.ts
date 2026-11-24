import { passwordProblem } from '../../src/lib/passwordPolicy';
import { defaultStaffPermissions, manageableRoles, staffPermissions } from '../../src/lib/adminAccess';
import { error, hashPassword, isAdminRole, json, randomId, readJson, type AdminEnv, type AdminUser } from './admin';

const forbidden = () => error('You do not have permission for this account action.', 403);
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export async function manageAccounts(env: AdminEnv, request: Request, actor: AdminUser, path: string) {
  const allowedRoles = manageableRoles(actor.role);
  if (!allowedRoles.length) return forbidden();

  const db = env.DB;
  const activeActor = 'EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND role = ? AND is_active = 1 AND deleted_at IS NULL)';
  const [collection, id, action] = path.split('/');
  if (collection !== 'users') return error('Account route not found.', 404);

  if (!id && request.method === 'GET') {
    const rows = await db.prepare(`
      SELECT id, email, name, role, is_active, permissions_json FROM admin_users
      WHERE deleted_at IS NULL AND id <> ? AND role IN (${allowedRoles.map(() => '?').join(',')})
      ORDER BY name, email
    `).bind(actor.id, ...allowedRoles).all<AdminUser & { permissions_json: string | null }>();
    return json({ users: rows.results.map(({ permissions_json, ...user }) => ({
      ...user, permissions: permissions_json ? JSON.parse(permissions_json) : defaultStaffPermissions,
    })) });
  }

  const creating = !id && request.method === 'POST';
  const editing = Boolean(id) && !action && request.method === 'PATCH';
  const deleting = Boolean(id) && !action && request.method === 'DELETE';
  const resetting = Boolean(id) && action === 'password' && request.method === 'POST';
  if (!creating && !editing && !deleting && !resetting) return error('Account route not found.', 404);
  if (id === actor.id) return forbidden();

  const target = id ? await db.prepare(
    'SELECT id, name, email, role, is_active, permissions_json FROM admin_users WHERE id = ? AND deleted_at IS NULL',
  ).bind(id).first<AdminUser & { permissions_json: string | null }>() : null;
  if (id && !target) return error('Account not found.', 404);
  if (target && !allowedRoles.includes(target.role)) return forbidden();

  const body = deleting ? {} : await readJson<Record<string, unknown>>(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Enter valid account details.');
  const role = body.role ?? target?.role;
  if (!isAdminRole(role) || !allowedRoles.includes(role)) return forbidden();

  const accountId = id || randomId();
  const eventId = randomId();
  const targetGuard = `id = ? AND role = ? AND deleted_at IS NULL AND ${activeActor}`;
  const targetParams = [accountId, target?.role, actor.id, actor.role];
  let event = 'update';
  let details: Record<string, unknown> = {};
  let permissionChanged = false;
  let revokeSessions = false;
  let write;

  if (deleting) {
    event = 'delete';
    details = { role };
    revokeSessions = true;
    // Keep historical assignments, notes and audit references linked to the deleted account.
    write = db.prepare(`UPDATE admin_users SET is_active = 0, deleted_at = datetime('now'),
      email = ?, password_hash = '', permissions_json = NULL, updated_at = datetime('now')
      WHERE ${targetGuard}`).bind(accountId + '@deleted.invalid', ...targetParams);
  } else if (resetting) {
    const weakPassword = passwordProblem(body.password, { email: target?.email, name: target?.name });
    if (weakPassword) return error(weakPassword);
    event = 'reset_password';
    revokeSessions = true;
    write = db.prepare(`UPDATE admin_users SET password_hash = ?, updated_at = datetime('now')
      WHERE ${targetGuard}`).bind(await hashPassword(body.password as string), ...targetParams);
  } else {
    const name = typeof body.name === 'string' ? body.name.trim() : target?.name ?? '';
    const email = typeof body.email === 'string' ? body.email.trim() : target?.email ?? '';
    if (!name || name.length > 150 || !validEmail(email)) return error('Enter a name and a valid email address.');
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') return error('Invalid account status.');
    const isActive = body.isActive === undefined ? target?.is_active ?? 1 : Number(body.isActive);
    const permissions = body.permissions;
    if (permissions !== undefined && (role !== 'editor' || !Array.isArray(permissions)
      || !permissions.every((value) => staffPermissions.some((permission) => permission === value)))) {
      return error('Invalid staff permissions.');
    }
    const savedPermissions = role === 'editor' ? JSON.stringify(permissions === undefined
      ? (target?.role === 'editor' && target.permissions_json ? JSON.parse(target.permissions_json) : defaultStaffPermissions)
      : staffPermissions.filter((permission) => (permissions as unknown[]).includes(permission))) : null;
    permissionChanged = Boolean(target && (role !== target.role || (permissions !== undefined && savedPermissions !== target.permissions_json)));
    details = { role, isActive: Boolean(isActive), ...(savedPermissions ? { permissions: JSON.parse(savedPermissions) } : {}) };
    if (creating) {
      const weakPassword = passwordProblem(body.password, { email, name });
      if (weakPassword) return error(weakPassword);
      event = 'create';
      write = db.prepare(`INSERT OR IGNORE INTO admin_users (id, email, name, password_hash, role, is_active, permissions_json)
        SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${activeActor}`)
        .bind(accountId, email, name, await hashPassword(body.password as string), role, isActive, savedPermissions, actor.id, actor.role);
    } else {
      revokeSessions = !isActive || permissionChanged;
      write = db.prepare(`UPDATE OR IGNORE admin_users SET email = ?, name = ?, role = ?, is_active = ?,
        permissions_json = ?, updated_at = datetime('now') WHERE ${targetGuard}`)
        .bind(email, name, role, isActive, savedPermissions, ...targetParams);
    }
  }

  const audit = db.prepare(`INSERT INTO admin_activity (id, user_id, action, entity_type, entity_id, details_json)
    SELECT ?, ?, ?, 'user', ?, ? WHERE changes() = 1`)
    .bind(eventId, actor.id, event, accountId, JSON.stringify(details));
  const statements = [write, audit];
  if (permissionChanged) statements.push(db.prepare(`INSERT INTO admin_activity
    (id, user_id, action, entity_type, entity_id, details_json)
    SELECT ?, ?, 'update_permissions', 'user', ?, ? WHERE EXISTS (SELECT 1 FROM admin_activity WHERE id = ?)`)
    .bind(randomId(), actor.id, accountId, JSON.stringify({ previousRole: target?.role, ...details }), eventId));
  if (revokeSessions) statements.push(db.prepare(`DELETE FROM admin_sessions WHERE user_id = ?
    AND EXISTS (SELECT 1 FROM admin_activity WHERE id = ?)`).bind(accountId, eventId));
  await db.batch(statements);
  const recorded = await db.prepare('SELECT id FROM admin_activity WHERE id = ?').bind(eventId).first();
  if (!recorded) return error('The account changed or that email is already in use.', 409);
  return json({ id: accountId }, { status: creating ? 201 : 200 });
}
