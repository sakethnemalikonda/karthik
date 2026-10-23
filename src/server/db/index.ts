import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const isVercel = Boolean(process.env.VERCEL);
const defaultDbPath = isVercel ? '/tmp/smartgov.db' : './data/smartgov.db';
const defaultUploadDir = isVercel ? '/tmp/uploads' : './uploads';

const DB_PATH = process.env.DATABASE_PATH || defaultDbPath;
const UPLOAD_DIR = process.env.UPLOAD_DIR || defaultUploadDir;

// Ensure database and uploads directories exist
const resolvedDbPath = path.resolve(DB_PATH);
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const uploadsAbs = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(uploadsAbs)) {
  fs.mkdirSync(uploadsAbs, { recursive: true });
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

// Initialize tables if not already present
export function initializeDatabase() {
  const schemaPath = path.resolve(import.meta.dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
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
