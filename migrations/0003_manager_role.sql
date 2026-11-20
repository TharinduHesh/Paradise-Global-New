-- SQLite requires rebuilding the user table to expand its role constraint.
-- Rename the original tables first so their foreign keys stay valid until copying finishes.
ALTER TABLE admin_users RENAME TO admin_users_before_manager;
ALTER TABLE admin_sessions RENAME TO admin_sessions_before_manager;
ALTER TABLE admin_invitations RENAME TO admin_invitations_before_manager;
ALTER TABLE media_assets RENAME TO media_assets_before_manager;
ALTER TABLE site_settings RENAME TO site_settings_before_manager;
ALTER TABLE enquiry_notes RENAME TO enquiry_notes_before_manager;
ALTER TABLE admin_activity RENAME TO admin_activity_before_manager;

CREATE TABLE admin_users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','manager')),
  is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), last_login_at TEXT
);
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE admin_invitations (
  id TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor')), token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL, created_by TEXT REFERENCES admin_users(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE media_assets (
  id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL,
  size INTEGER NOT NULL, alt_text TEXT NOT NULL DEFAULT '', created_by TEXT REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE enquiry_notes (
  id TEXT PRIMARY KEY, enquiry_id INTEGER NOT NULL REFERENCES contact_enquiries(id) ON DELETE CASCADE,
  note TEXT NOT NULL, created_by TEXT REFERENCES admin_users(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE admin_activity (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES admin_users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL,
  entity_id TEXT, details_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO admin_users SELECT * FROM admin_users_before_manager;
INSERT INTO admin_sessions SELECT * FROM admin_sessions_before_manager;
INSERT INTO admin_invitations SELECT * FROM admin_invitations_before_manager;
INSERT INTO media_assets SELECT * FROM media_assets_before_manager;
INSERT INTO site_settings SELECT * FROM site_settings_before_manager;
INSERT INTO enquiry_notes SELECT * FROM enquiry_notes_before_manager;
INSERT INTO admin_activity SELECT * FROM admin_activity_before_manager;

DROP TABLE admin_activity_before_manager;
DROP TABLE enquiry_notes_before_manager;
DROP TABLE site_settings_before_manager;
DROP TABLE media_assets_before_manager;
DROP TABLE admin_invitations_before_manager;
DROP TABLE admin_sessions_before_manager;
DROP TABLE admin_users_before_manager;

CREATE INDEX idx_admin_sessions_token ON admin_sessions(token_hash);
CREATE INDEX idx_activity_created_at ON admin_activity(created_at);
