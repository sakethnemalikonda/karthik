import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SCHEMA_SQL } from './schema.js';

const requireModule = createRequire(import.meta.url);

let DatabaseSyncClass: any = null;
try {
  const sqliteMod: any = requireModule('node:sqlite');
  DatabaseSyncClass = sqliteMod.DatabaseSync || sqliteMod.Database;
} catch (e) {
  console.warn('node:sqlite is not available in this Node runtime. Using robust in-memory database store.');
}

const isVercel = Boolean(process.env.VERCEL);
const defaultDbPath = isVercel ? '/tmp/smartgov.db' : './data/smartgov.db';
const defaultUploadDir = isVercel ? '/tmp/uploads' : './uploads';

const DB_PATH = isVercel ? '/tmp/smartgov.db' : (process.env.DATABASE_PATH || defaultDbPath);
const UPLOAD_DIR = isVercel ? '/tmp/uploads' : (process.env.UPLOAD_DIR || defaultUploadDir);

// Ensure database and uploads directories exist
const resolvedDbPath = path.resolve(DB_PATH);
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch {
    // Directory might already exist or handled by host
  }
}

// On Vercel, if /tmp/smartgov.db does not exist, copy pre-seeded database if available
if (isVercel && !fs.existsSync(resolvedDbPath)) {
  const seedDbPath = path.resolve('./data/smartgov.db');
  if (fs.existsSync(seedDbPath)) {
    try {
      fs.copyFileSync(seedDbPath, resolvedDbPath);
    } catch (err) {
      console.warn('Could not copy seed database to /tmp:', err);
    }
  }
}

const uploadsAbs = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(uploadsAbs)) {
  try {
    fs.mkdirSync(uploadsAbs, { recursive: true });
  } catch {
    // Directory might already exist or handled by host
  }
}

function createFallbackDb() {
  const tables: Record<string, any[]> = {
    users: [],
    security_events: [],
    departments: [],
    complaints: [],
    complaint_analyses: [],
    complaint_status_history: [],
    notifications: [],
    audit_logs: [],
    master_issues: [],
    system_settings: [],
  };

  return {
    exec(sql: string) {
      if (sql.includes('DELETE FROM')) {
        for (const key of Object.keys(tables)) {
          if (sql.includes(`DELETE FROM ${key}`)) {
            tables[key] = [];
          }
        }
      }
    },
    prepare(sql: string) {
      const cleanSql = sql.trim();
      return {
        run(...params: any[]) {
          // INSERT INTO users
          if (/INSERT\s+(OR\s+IGNORE\s+)?INTO\s+users/i.test(cleanSql)) {
            let role = 'CITIZEN';
            let status = 'ACTIVE';
            let created_at = new Date().toISOString();
            let updated_at = created_at;
            let last_login_at = created_at;

            if (params.length >= 10) {
              role = params[5] || 'CITIZEN';
              status = params[6] || 'ACTIVE';
              created_at = params[7] || created_at;
              updated_at = params[8] || updated_at;
              last_login_at = params[9] || last_login_at;
            } else if (params.length === 8) {
              created_at = params[5] || created_at;
              updated_at = params[6] || updated_at;
              last_login_at = params[7] || last_login_at;
            }

            const user = {
              id: params[0],
              phone: params[1],
              name: params[2],
              email: params[3],
              password_hash: params[4],
              role,
              status,
              created_at,
              updated_at,
              last_login_at,
            };
            const existingIdx = tables.users.findIndex((u) => u.phone === user.phone || u.id === user.id);
            if (existingIdx === -1) {
              tables.users.push(user);
            } else {
              tables.users[existingIdx] = { ...tables.users[existingIdx], ...user };
            }
            return { changes: 1, lastInsertRowid: tables.users.length };
          }
          // INSERT INTO security_events
          if (/INSERT\s+INTO\s+security_events/i.test(cleanSql)) {
            tables.security_events.push({
              id: params[0],
              user_id: params[1],
              event_type: params[2],
              ip_address: params[3],
              user_agent: params[4],
              details: params[5],
              created_at: params[6],
            });
            return { changes: 1 };
          }
          // INSERT INTO departments
          if (/INSERT\s+(OR\s+IGNORE\s+)?INTO\s+departments/i.test(cleanSql)) {
            tables.departments.push({
              id: params[0],
              code: params[1],
              name: params[2],
              description: params[3],
              categories_json: params[4],
              head_name: params[5],
              contact_email: params[6],
              contact_phone: params[7],
              active: 1,
              created_at: params[8],
            });
            return { changes: 1 };
          }
          // INSERT INTO system_settings
          if (/INSERT\s+(OR\s+IGNORE\s+)?INTO\s+system_settings/i.test(cleanSql)) {
            tables.system_settings.push({
              key: params[0],
              value_json: params[1],
              updated_at: params[2],
            });
            return { changes: 1 };
          }
          // UPDATE users SET last_login_at
          if (/UPDATE\s+users\s+SET\s+last_login_at/i.test(cleanSql)) {
            const u = tables.users.find((x) => x.id === params[1]);
            if (u) u.last_login_at = params[0];
            return { changes: 1 };
          }
          // UPDATE users SET password_hash
          if (/UPDATE\s+users\s+SET\s+password_hash/i.test(cleanSql)) {
            const u = tables.users.find((x) => x.id === params[2]);
            if (u) {
              u.password_hash = params[0];
              u.updated_at = params[1];
            }
            return { changes: 1 };
          }
          // UPDATE users SET status
          if (/UPDATE\s+users\s+SET\s+status/i.test(cleanSql)) {
            const u = tables.users.find((x) => x.id === params[2]);
            if (u) {
              u.status = params[0];
              u.updated_at = params[1];
            }
            return { changes: 1 };
          }
          // INSERT INTO complaints
          if (/INSERT\s+INTO\s+complaints/i.test(cleanSql)) {
            tables.complaints.push({
              id: params[0],
              citizen_id: params[1],
              title: params[2],
              description: params[3],
              category: params[4],
              priority: params[5],
              status: params[6],
              state: params[7],
              city: params[8],
              locality: params[9],
              address: params[10],
              latitude: params[11],
              longitude: params[12],
              language: params[13],
              image_url: params[14],
              assigned_department_id: params[15],
              recommended_department_id: params[16],
              master_issue_id: params[17],
              created_at: params[18],
              updated_at: params[19],
            });
            return { changes: 1 };
          }
          // INSERT INTO complaint_analyses
          if (/INSERT\s+INTO\s+complaint_analyses/i.test(cleanSql)) {
            tables.complaint_analyses.push({
              id: params[0],
              complaint_id: params[1],
              cleaned_text: params[2],
              tokens_count: params[3],
              language_detected: params[4],
              category_predicted: params[5],
              category_confidence: params[6],
              category_explanation: params[7],
              priority_predicted: params[8],
              priority_confidence: params[9],
              priority_reasons_json: params[10],
              recommended_department_code: params[11],
              recommended_department_name: params[12],
              urgency_score: params[13],
              sentiment_score: params[14],
              sentiment_label: params[15],
              potential_duplicates_json: params[16],
              master_issue_suggested: params[17],
              suggested_master_issue_id: params[18],
              processed_at: params[19],
              engine_version: params[20],
            });
            return { changes: 1 };
          }
          // INSERT INTO complaint_status_history
          if (/INSERT\s+INTO\s+complaint_status_history/i.test(cleanSql)) {
            tables.complaint_status_history.push({
              id: params[0],
              complaint_id: params[1],
              previous_status: params[2],
              new_status: params[3],
              actor_id: params[4],
              actor_name: params[5],
              actor_role: params[6],
              citizen_remark: params[7],
              internal_note: params[8],
              created_at: params[9],
            });
            return { changes: 1 };
          }
          // INSERT INTO notifications
          if (/INSERT\s+INTO\s+notifications/i.test(cleanSql)) {
            tables.notifications.push({
              id: params[0],
              user_id: params[1],
              complaint_id: params[2],
              title: params[3],
              message: params[4],
              type: params[5],
              read: params[6],
              link: params[7],
              created_at: params[8],
            });
            return { changes: 1 };
          }
          // UPDATE notifications SET read = 1
          if (/UPDATE\s+notifications\s+SET\s+read\s*=\s*1/i.test(cleanSql)) {
            let changes = 0;
            for (const n of tables.notifications) {
              if (n.id === params[0] && n.user_id === params[1]) {
                n.read = 1;
                changes++;
              }
            }
            return { changes };
          }
          return { changes: 1 };
        },
        get(...params: any[]) {
          // SELECT COUNT(*) as count FROM users
          if (/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+users/i.test(cleanSql)) {
            return { count: tables.users.length };
          }
          // SELECT COUNT(*) as count FROM complaints
          if (/SELECT\s+COUNT\(\*\)\s+as\s+cnt\s+FROM\s+complaints/i.test(cleanSql)) {
            return { cnt: tables.complaints.length };
          }
          // SELECT id FROM users WHERE phone = ?
          if (/SELECT\s+id\s+FROM\s+users\s+WHERE\s+phone\s*=\s*\?/i.test(cleanSql)) {
            const u = tables.users.find((x) => x.phone === params[0]);
            return u ? { id: u.id } : undefined;
          }
          // SELECT id FROM users WHERE email = ?
          if (/FROM\s+users\s+WHERE\s+email\s*=\s*\?/i.test(cleanSql)) {
            const u = tables.users.find((x) => x.email && x.email.toLowerCase() === String(params[0]).toLowerCase());
            return u ? { id: u.id, ...u } : undefined;
          }
          // SELECT ... FROM users WHERE phone = ?
          if (/FROM\s+users\s+WHERE\s+phone\s*=\s*\?/i.test(cleanSql)) {
            return tables.users.find((x) => x.phone === params[0]);
          }
          // SELECT ... FROM users WHERE id = ?
          if (/FROM\s+users\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
            return tables.users.find((x) => x.id === params[0]);
          }
          // SELECT id FROM departments WHERE code = ?
          if (/FROM\s+departments\s+WHERE\s+code\s*=\s*\?/i.test(cleanSql)) {
            return tables.departments.find((x) => x.code === params[0]);
          }
          // SELECT * FROM departments WHERE id = ?
          if (/FROM\s+departments\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
            return tables.departments.find((x) => x.id === params[0]);
          }
          // SELECT * FROM complaints WHERE id = ?
          if (/FROM\s+complaints.*WHERE.*id\s*=\s*\?/i.test(cleanSql)) {
            return tables.complaints.find((x) => x.id === params[0]);
          }
          return undefined;
        },
        all(...params: any[]) {
          if (/FROM\s+departments/i.test(cleanSql)) {
            return tables.departments;
          }
          if (/FROM\s+system_settings/i.test(cleanSql)) {
            return tables.system_settings;
          }
          if (/FROM\s+notifications/i.test(cleanSql)) {
            return tables.notifications.filter((n) => n.user_id === params[0]);
          }
          if (/FROM\s+complaints/i.test(cleanSql)) {
            return tables.complaints;
          }
          if (/FROM\s+users/i.test(cleanSql)) {
            return tables.users;
          }
          return [];
        },
      };
    },
  };
}

// Initialize database instance:
// 1. Try file-based SQLite
// 2. Fall back to in-memory SQLite (:memory:)
// 3. Fall back to pure JS in-memory store if node:sqlite is absent on the runtime
let dbInstance: any = null;

if (DatabaseSyncClass) {
  try {
    dbInstance = new DatabaseSyncClass(resolvedDbPath);
  } catch (fileErr) {
    console.warn(`Could not open SQLite file at "${resolvedDbPath}". Falling back to in-memory SQLite:`, fileErr);
    try {
      dbInstance = new DatabaseSyncClass(':memory:');
    } catch (memErr) {
      console.warn('In-memory DatabaseSync failed, using fallback store:', memErr);
    }
  }
}

if (!dbInstance) {
  dbInstance = createFallbackDb();
}

export const db = dbInstance;

// Pragmas
try {
  db.exec('PRAGMA foreign_keys = ON;');
} catch {}

if (!isVercel) {
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {}
} else {
  try {
    db.exec('PRAGMA journal_mode = MEMORY;');
  } catch {}
}

function seedInitialDataIfEmpty() {
  try {
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    if (userCount > 0) return;

    const now = new Date().toISOString();
    const adminHash = '$2b$10$Y/UjYzszOqEiTk3cVXaPWOuM081eS0y6SVJGYA0T8Tp11BkG8TFc.';
    const citizenHash = '$2b$10$QrGQifNuiJPT5hJNY8MPDuje7uOBGg3xa/GQUs1d5LNKbRXEOqUnq';

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, phone, name, email, password_hash, role, status, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'USR-ADMIN-001',
      process.env.ADMIN_PHONE || '+919876543210',
      process.env.ADMIN_NAME || 'Chief Grievance Administrator',
      process.env.ADMIN_EMAIL || 'admin@smartgov.local',
      adminHash,
      'ADMIN',
      'ACTIVE',
      now,
      now,
      now
    );

    insertUser.run(
      'USR-CITIZEN-001',
      process.env.DEMO_CITIZEN_PHONE || '+919876543211',
      process.env.DEMO_CITIZEN_NAME || 'Priya Sharma',
      process.env.DEMO_CITIZEN_EMAIL || 'priya.sharma@example.com',
      citizenHash,
      'CITIZEN',
      'ACTIVE',
      now,
      now,
      now
    );

    const insertDept = db.prepare(`
      INSERT OR IGNORE INTO departments (id, code, name, description, categories_json, head_name, contact_email, contact_phone, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const departments = [
      {
        id: 'DEPT-ROADS',
        code: 'DEPT_ROADS',
        name: 'Public Works & Roads Department (PWD)',
        desc: 'Responsible for arterial roads, pothole repairs, bridges, flyovers, and pedestrian footpaths.',
        categories: ['ROADS'],
        head: 'Er. R. K. Nambiar (Chief Engineer - Roads)',
        email: 'pwd.roads@smartgov.local',
        phone: '+91 80 2297 5001',
      },
      {
        id: 'DEPT-WATER',
        code: 'DEPT_WATER',
        name: 'Water Supply & Sewerage Board (BWSSB)',
        desc: 'Operates drinking water distribution pipelines, reservoir maintenance, and major leak repairs.',
        categories: ['WATER'],
        head: 'Smt. Deepa Sundaram (Executive Engineer)',
        email: 'bwssb.water@smartgov.local',
        phone: '+91 80 2297 5002',
      },
      {
        id: 'DEPT-SANITATION',
        code: 'DEPT_SANITATION',
        name: 'Solid Waste Management & Sanitation Dept',
        desc: 'Daily doorstep garbage collection, commercial waste clearance, and community sanitation bins.',
        categories: ['GARBAGE'],
        head: 'Dr. Mohan Kumar (Joint Commissioner SWM)',
        email: 'sanitation@smartgov.local',
        phone: '+91 80 2297 5003',
      },
      {
        id: 'DEPT-POWER',
        code: 'DEPT_POWER',
        name: 'Electricity Supply & Streetlight Authority (BESCOM)',
        desc: 'Maintains low and high-voltage transmission lines, transformers, and public streetlight infrastructure.',
        categories: ['ELECTRICITY'],
        head: 'Er. Arvind Swamy (Superintending Engineer)',
        email: 'power.streetlights@smartgov.local',
        phone: '+91 80 2297 5004',
      },
      {
        id: 'DEPT-DRAINAGE',
        code: 'DEPT_DRAINAGE',
        name: 'Stormwater & Underground Drainage Cell',
        desc: 'Stormwater drain desilting, culvert maintenance, and flood mitigation canals.',
        categories: ['DRAINAGE'],
        head: 'Er. V. Chandrasekhar (Chief Hydrologist)',
        email: 'drainage.flood@smartgov.local',
        phone: '+91 80 2297 5005',
      },
      {
        id: 'DEPT-SAFETY',
        code: 'DEPT_SAFETY',
        name: 'Disaster Management & Public Safety Cell',
        desc: 'Emergency structural risk management, tree fall clearance, hazard perimeter cordoning.',
        categories: ['PUBLIC_SAFETY', 'OTHER'],
        head: 'Col. (Retd.) Sanjeev Hegde (Director Disaster Cell)',
        email: 'safety.emergency@smartgov.local',
        phone: '+91 80 2297 5006',
      },
    ];

    for (const d of departments) {
      insertDept.run(d.id, d.code, d.name, d.desc, JSON.stringify(d.categories), d.head, d.email, d.phone, now);
    }

    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO system_settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
    `);
    insertSetting.run('auto_routing_enabled', JSON.stringify(true), now);
    insertSetting.run('duplicate_similarity_threshold', JSON.stringify(55), now);
    insertSetting.run('sms_notifications_enabled', JSON.stringify(false), now);
    insertSetting.run('default_city', JSON.stringify('Bengaluru'), now);
  } catch (err) {
    console.error('Initial data seeding failed:', err);
  }
}

export function initializeDatabase() {
  try {
    db.exec(SCHEMA_SQL);
    seedInitialDataIfEmpty();
  } catch (err) {
    console.error('Database schema init error:', err);
  }
}

export function runInTransaction<T>(fn: () => T): T {
  try {
    db.exec('BEGIN TRANSACTION;');
  } catch {}
  try {
    const result = fn();
    try {
      db.exec('COMMIT;');
    } catch {}
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch {}
    throw error;
  }
}

initializeDatabase();
