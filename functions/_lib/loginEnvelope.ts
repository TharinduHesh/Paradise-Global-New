import { deriveEnvelopeKey, fromBase64, generateEnvelopeKeyPair, toBase64, type LoginEnvelope } from '../../src/lib/loginEnvelope';
import { randomId, type AdminEnv } from './admin';

const CHALLENGE_MINUTES = 5;

/** Issues a one-time server key pair; the private half stays in D1 and is deleted on first use. */
export const createLoginChallenge = async (env: AdminEnv) => {
  const pair = await generateEnvelopeKeyPair();
  const id = randomId();
  const privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM login_challenges WHERE expires_at <= datetime('now')`),
    env.DB.prepare(`INSERT INTO login_challenges (id, private_jwk, expires_at) VALUES (?, ?, datetime('now', '+${CHALLENGE_MINUTES} minutes'))`)
      .bind(id, privateJwk),
  ]);
  return { id, publicKey: toBase64(await crypto.subtle.exportKey('raw', pair.publicKey)) };
};

const isEnvelope = (value: unknown): value is LoginEnvelope => {
  if (!value || typeof value !== 'object') return false;
  const fields = value as Record<string, unknown>;
  return typeof fields.challengeId === 'string' && fields.challengeId.length <= 64
    && typeof fields.clientKey === 'string' && fields.clientKey.length <= 128
    && typeof fields.iv === 'string' && fields.iv.length <= 32
    && typeof fields.data === 'string' && fields.data.length <= 16384;
};

/**
 * Decrypts an encrypted sign-in body. The challenge is consumed atomically, so the same request
 * can never be accepted twice. Returns null for anything expired, reused, tampered with or malformed.
 */
export const openLoginEnvelope = async <T>(env: AdminEnv, request: Request): Promise<T | null> => {
  let envelope: unknown;
  try { envelope = await request.json(); } catch { return null; }
  if (!isEnvelope(envelope)) return null;
  const row = await env.DB.prepare(`DELETE FROM login_challenges WHERE id = ? AND expires_at > datetime('now') RETURNING private_jwk`)
    .bind(envelope.challengeId).first<{ private_jwk: string }>();
  if (!row) return null;
  try {
    const privateKey = await crypto.subtle.importKey('jwk', JSON.parse(row.private_jwk) as JsonWebKey, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    const key = await deriveEnvelopeKey(privateKey, fromBase64(envelope.clientKey), envelope.challengeId, 'decrypt');
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.iv), additionalData: new TextEncoder().encode(envelope.challengeId) },
      key,
      fromBase64(envelope.data),
    );
    const payload = JSON.parse(new TextDecoder().decode(plain)) as unknown;
    return payload && typeof payload === 'object' ? payload as T : null;
  } catch {
    return null;
  }
};
