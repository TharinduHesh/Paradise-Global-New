CREATE TABLE IF NOT EXISTS contact_enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  property_location TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'website',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_created_at
  ON contact_enquiries (created_at);
