interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

export interface AdminEnv {
  DB: D1Database;
  OWNER_SETUP_TOKEN?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor';
  is_active: number;
}

export interface AdminContext {
  request: Request;
  env: AdminEnv;
  user?: AdminUser;
}

const SESSION_COOKIE = 'pgl_admin_session';
const SESSION_SECONDS = 5 * 60;
const bytesToHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map((value) => parseInt(value, 16)) ?? []);

export const randomId = () => bytesToHex(crypto.getRandomValues(new Uint8Array(16)));

// Cloudflare's production runtime caps Web Crypto PBKDF2 at 100,000 iterations.
const PASSWORD_ITERATIONS = 100_000;
const LEGACY_PASSWORD_ITERATIONS = 210_000;

const derivePasswordHash = async (password: string, salt: string, iterations: number) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt), iterations, hash: 'SHA-256' }, key, 256);
  return bytesToHex(new Uint8Array(bits));
};

export const hashPassword = async (password: string) => {
  const salt = randomId();
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const parts = stored.split('$');
  const isLegacy = parts.length === 3;
  const [algorithm, roundsOrSalt, saltOrHash, hash] = parts;
  const salt = isLegacy ? roundsOrSalt : saltOrHash;
  const expected = isLegacy ? saltOrHash : hash;
  if (algorithm !== 'pbkdf2' || !salt || !expected) return false;
  if (!isLegacy && (parts.length !== 4 || roundsOrSalt !== String(PASSWORD_ITERATIONS))) return false;
  const iterations = isLegacy ? LEGACY_PASSWORD_ITERATIONS : PASSWORD_ITERATIONS;
  return await derivePasswordHash(password, salt, iterations) === expected;
};

const sha256 = async (value: string) => bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
const json = (body: unknown, init?: ResponseInit) => Response.json(body, { headers: { 'Cache-Control': 'no-store' }, ...init });
export const error = (message: string, status = 400) => json({ error: message }, { status });
export const readJson = async <T>(request: Request): Promise<T | null> => {
  try { return await request.json() as T; } catch { return null; }
};

export const getCookie = (request: Request, name: string) => request.headers.get('Cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
const cookie = (value: string, maxAge: number) => `${SESSION_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;

export const createSession = async (env: AdminEnv, userId: string) => {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare('INSERT INTO admin_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime("now", "+5 minutes"))')
    .bind(randomId(), userId, await sha256(token)).run();
  return token;
};

export const clearSession = async (env: AdminEnv, request: Request) => {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return new Headers({ 'Set-Cookie': cookie('', 0) });
};

export const requireUser = async (context: AdminContext) => {
  const token = getCookie(context.request, SESSION_COOKIE);
  if (!token) return null;
  const result = await context.env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.is_active FROM admin_sessions s
    JOIN admin_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.is_active = 1
  `).bind(await sha256(token)).first<AdminUser>();
  return result ?? null;
};

export const hasRole = (user: AdminUser, roles: AdminUser['role'][]) => roles.includes(user.role);
export const logActivity = async (env: AdminEnv, userId: string | undefined, action: string, entityType: string, entityId?: string, details: Record<string, unknown> = {}) =>
  env.DB.prepare('INSERT INTO admin_activity (id, user_id, action, entity_type, entity_id, details_json) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(randomId(), userId ?? null, action, entityType, entityId ?? null, JSON.stringify(details)).run();

export const withAuth = async (context: AdminContext, roles: AdminUser['role'][] = []) => {
  const user = await requireUser(context);
  if (!user) return { response: error('Authentication required.', 401) };
  if (roles.length && !hasRole(user, roles)) return { response: error('You do not have permission for this action.', 403) };
  return { user };
};

export { SESSION_COOKIE, SESSION_SECONDS, cookie, json };
