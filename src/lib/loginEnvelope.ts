/**
 * Encrypted sign-in envelope, shared by the admin login page and the Pages Function that reads it.
 *
 * The browser asks for a one-time challenge (a fresh server ECDH P-256 public key), makes its own
 * one-time key pair, and derives an AES-256-GCM key from the two (ECDH, then HKDF-SHA256).
 * The email, password and security-check token travel only inside the AES-GCM ciphertext, and the
 * challenge is deleted the moment it is used, so a captured request cannot be decrypted later or replayed.
 */

export interface LoginChallenge { id: string; publicKey: string }
export interface LoginEnvelope { challengeId: string; clientKey: string; iv: string; data: string }

const CURVE = { name: 'ECDH', namedCurve: 'P-256' } as const;
const INFO = new TextEncoder().encode('pgl-admin-login-v1');

export const toBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text = '';
  for (const byte of view) text += String.fromCharCode(byte);
  return btoa(text);
};

export const fromBase64 = (text: string) => Uint8Array.from(atob(text), (character) => character.charCodeAt(0));

/** Derives the AES-GCM key both sides share; the challenge id is the HKDF salt so each key belongs to one challenge. */
export const deriveEnvelopeKey = async (privateKey: CryptoKey, peerPublicKeyRaw: Uint8Array, challengeId: string, usage: 'encrypt' | 'decrypt') => {
  const peer = await crypto.subtle.importKey('raw', peerPublicKeyRaw as BufferSource, CURVE, false, []);
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: peer }, privateKey, 256);
  const base = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode(challengeId), info: INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
};

export const generateEnvelopeKeyPair = () => crypto.subtle.generateKey(CURVE, true, ['deriveBits']) as Promise<CryptoKeyPair>;

/** Browser side: encrypts the sign-in fields for one challenge. */
export const sealLoginPayload = async (challenge: LoginChallenge, payload: Record<string, unknown>): Promise<LoginEnvelope> => {
  const pair = await generateEnvelopeKeyPair();
  const key = await deriveEnvelopeKey(pair.privateKey, fromBase64(challenge.publicKey), challenge.id, 'encrypt');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(challenge.id) },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return {
    challengeId: challenge.id,
    clientKey: toBase64(await crypto.subtle.exportKey('raw', pair.publicKey)),
    iv: toBase64(iv),
    data: toBase64(data),
  };
};
