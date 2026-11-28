-- Email-based review moderation. Existing reviews and other tables are unchanged.

-- Optional reason given when a review is rejected (from the email link or the dashboard).
ALTER TABLE customer_reviews ADD COLUMN rejection_reason TEXT NOT NULL DEFAULT '';

-- One-time approve/reject links sent in the new-review email. Only a SHA-256 hash of each token is stored, so a database
-- leak cannot be used to moderate. A token works once, for one review, one action and the recipient it was sent to, and
-- expires after 48 hours; every token of a review is spent as soon as that review is moderated by any route.
CREATE TABLE IF NOT EXISTS review_moderation_tokens (
  id TEXT PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES customer_reviews(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  token_hash TEXT NOT NULL UNIQUE,
  recipient TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_moderation_tokens_review ON review_moderation_tokens(review_id);
CREATE INDEX IF NOT EXISTS idx_review_moderation_tokens_expiry ON review_moderation_tokens(expires_at);
