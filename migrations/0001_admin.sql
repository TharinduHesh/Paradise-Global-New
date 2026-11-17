CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('owner','admin','editor')),
  is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admin_invitations (
  id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor')), token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL, created_by TEXT REFERENCES admin_users(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY, content_type TEXT NOT NULL CHECK (content_type IN ('property','service','destination','gallery')),
  slug TEXT NOT NULL, title TEXT NOT NULL, data_json TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(content_type, slug)
);
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL,
  size INTEGER NOT NULL, alt_text TEXT NOT NULL DEFAULT '', created_by TEXT REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS enquiry_notes (
  id TEXT PRIMARY KEY, enquiry_id INTEGER NOT NULL REFERENCES contact_enquiries(id) ON DELETE CASCADE,
  note TEXT NOT NULL, created_by TEXT REFERENCES admin_users(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admin_activity (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES admin_users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL,
  entity_id TEXT, details_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_content_items_type_published ON content_items(content_type, is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON admin_activity(created_at);
