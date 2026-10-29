import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_SQL } from './schema.js';

const isVercel = Boolean(process.env.VERCEL);
const defaultDbPath = isVercel ? '/tmp/smartgov.db' : './data/smartgov.db';
const defaultUploadDir = isVercel ? '/tmp/uploads' : './uploads';

const DB_PATH = process.env.DATABASE_PATH || defaultDbPath;
const UPLOAD_DIR = process.env.UPLOAD_DIR || defaultUploadDir;

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

const uploadsAbs = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(uploadsAbs)) {
  try {
    fs.mkdirSync(uploadsAbs, { recursive: true });
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
    } catch {
      // Fallback to manual init below
    }
  }
}

// Initialize SQLite database
export const db = new DatabaseSync(resolvedDbPath);

// Enable foreign keys and WAL mode for optimal concurrency and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function seedInitialDataIfEmpty() {
  try {
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    if (userCount > 0) return;

    const now = new Date().toISOString();
    // Precomputed bcrypt hash for 'Admin@12345' and 'Citizen@12345'
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
        phone: '+91 80 2297 5001'
      },
      {
        id: 'DEPT-WATER',
        code: 'DEPT_WATER',
        name: 'Water Supply & Sewerage Board (BWSSB)',
        desc: 'Operates drinking water distribution pipelines, reservoir maintenance, and major leak repairs.',
        categories: ['WATER'],
        head: 'Smt. Deepa Sundaram (Executive Engineer)',
        email: 'bwssb.water@smartgov.local',
        phone: '+91 80 2297 5002'
      },
      {
        id: 'DEPT-SANITATION',
        code: 'DEPT_SANITATION',
        name: 'Solid Waste Management & Sanitation Dept',
        desc: 'Daily doorstep garbage collection, commercial waste clearance, and community sanitation bins.',
        categories: ['GARBAGE'],
        head: 'Dr. Mohan Kumar (Joint Commissioner SWM)',
        email: 'sanitation@smartgov.local',
        phone: '+91 80 2297 5003'
      },
      {
        id: 'DEPT-POWER',
        code: 'DEPT_POWER',
        name: 'Electricity Supply & Streetlight Authority (BESCOM)',
        desc: 'Maintains low and high-voltage transmission lines, transformers, and public streetlight infrastructure.',
        categories: ['ELECTRICITY'],
        head: 'Er. Arvind Swamy (Superintending Engineer)',
        email: 'power.streetlights@smartgov.local',
        phone: '+91 80 2297 5004'
      },
      {
        id: 'DEPT-DRAINAGE',
        code: 'DEPT_DRAINAGE',
        name: 'Stormwater & Underground Drainage Cell',
        desc: 'Stormwater drain desilting, culvert maintenance, and flood mitigation canals.',
        categories: ['DRAINAGE'],
        head: 'Er. V. Chandrasekhar (Chief Hydrologist)',
        email: 'drainage.flood@smartgov.local',
        phone: '+91 80 2297 5005'
      },
      {
        id: 'DEPT-SAFETY',
        code: 'DEPT_SAFETY',
        name: 'Disaster Management & Public Safety Cell',
        desc: 'Emergency structural risk management, tree fall clearance, hazard perimeter cordoning.',
        categories: ['PUBLIC_SAFETY', 'OTHER'],
        head: 'Col. (Retd.) Sanjeev Hegde (Director Disaster Cell)',
        email: 'safety.emergency@smartgov.local',
        phone: '+91 80 2297 5006'
      }
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

// Initialize tables if not already present
export function initializeDatabase() {
  db.exec(SCHEMA_SQL);
  seedInitialDataIfEmpty();
}

// Transaction runner helper
export function runInTransaction<T>(fn: () => T): T {
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

// Run initial migration
initializeDatabase();
