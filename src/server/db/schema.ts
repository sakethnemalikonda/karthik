// SmartGov Connect AI Database Schema

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CITIZEN',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  categories_json TEXT NOT NULL DEFAULT '[]',
  head_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  locality TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  complaint_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_master_issues_category ON master_issues(category);
CREATE INDEX IF NOT EXISTS idx_master_issues_locality ON master_issues(locality);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  citizen_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  predicted_category TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT,
  latitude REAL,
  longitude REAL,
  language TEXT NOT NULL DEFAULT 'en',
  image_url TEXT,
  assigned_department_id TEXT,
  recommended_department_id TEXT,
  master_issue_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (recommended_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (master_issue_id) REFERENCES master_issues(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_master_issue ON complaints(master_issue_id);

CREATE TABLE IF NOT EXISTS complaint_analyses (
  id TEXT PRIMARY KEY,
  complaint_id TEXT UNIQUE NOT NULL,
  cleaned_text TEXT NOT NULL,
  tokens_count INTEGER NOT NULL,
  language_detected TEXT NOT NULL,
  category_predicted TEXT NOT NULL,
  category_confidence REAL NOT NULL,
  category_explanation TEXT NOT NULL,
  priority_predicted TEXT NOT NULL,
  priority_confidence REAL NOT NULL,
  priority_reasons_json TEXT NOT NULL DEFAULT '[]',
  recommended_department_code TEXT NOT NULL,
  recommended_department_name TEXT NOT NULL,
  urgency_score REAL NOT NULL,
  sentiment_score REAL NOT NULL,
  sentiment_label TEXT NOT NULL,
  potential_duplicates_json TEXT NOT NULL DEFAULT '[]',
  master_issue_suggested INTEGER NOT NULL DEFAULT 0,
  suggested_master_issue_id TEXT,
  processed_at TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  citizen_remark TEXT,
  internal_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_status_history(complaint_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  complaint_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
