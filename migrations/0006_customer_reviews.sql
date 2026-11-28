-- Customer reviews submitted from the website. New reviews are 'pending' and stay private until an admin publishes them.
-- Existing tables (including testimonials in content_items) are not touched.
CREATE TABLE IF NOT EXISTS customer_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  -- Private: shown only in the admin console and never returned by the public API.
  email TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'hidden')),
  admin_reply TEXT NOT NULL DEFAULT '',
  admin_reply_he TEXT NOT NULL DEFAULT '',
  replied_at TEXT,
  replied_by TEXT REFERENCES admin_users(id),
  -- SHA-256 of the visitor's IP address, used only for rate limiting; the address itself is never stored.
  ip_hash TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_status_published ON customer_reviews(status, published_at);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_email_created ON customer_reviews(email, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_ip_created ON customer_reviews(ip_hash, created_at);
