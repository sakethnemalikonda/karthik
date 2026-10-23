import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH || './data/smartgov.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure data and uploads directories exist
const dbDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const uploadsAbs = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(uploadsAbs)) {
  fs.mkdirSync(uploadsAbs, { recursive: true });
}

// Initialize SQLite database
export const db = new DatabaseSync(path.resolve(DB_PATH));

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
