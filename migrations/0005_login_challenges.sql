-- One-time key pairs for the encrypted admin sign-in request. Each row is deleted when it is used or after it expires.
CREATE TABLE IF NOT EXISTS login_challenges (
  id TEXT PRIMARY KEY,
  private_jwk TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_challenges_expiry ON login_challenges(expires_at);
