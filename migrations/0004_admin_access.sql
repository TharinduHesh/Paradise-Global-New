ALTER TABLE admin_users ADD COLUMN permissions_json TEXT;
ALTER TABLE admin_users ADD COLUMN deleted_at TEXT;
ALTER TABLE contact_enquiries ADD COLUMN assigned_to TEXT REFERENCES admin_users(id);
CREATE INDEX idx_enquiry_assignment ON contact_enquiries(assigned_to);

-- Expand the existing content catalogue without changing IDs or published records.
ALTER TABLE content_items RENAME TO content_items_before_sections;
CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'property', 'service', 'destination', 'gallery', 'hospitality', 'project',
    'testimonial', 'page', 'media', 'translation'
  )),
  slug TEXT NOT NULL, title TEXT NOT NULL, data_json TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(content_type, slug)
);
INSERT INTO content_items SELECT * FROM content_items_before_sections;
DROP TABLE content_items_before_sections;
CREATE INDEX idx_content_items_type_published ON content_items(content_type, is_published, sort_order);
