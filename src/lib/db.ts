/**
 * SQLite database singleton for MediaVault.
 *
 * IMPORTANT: In Next.js (especially dev mode with HMR), a module can be
 * re-evaluated multiple times within the same Node.js process.  Plain
 * module-level `let _db` variables are reset on every re-evaluation.
 *
 * The fix is to store state on `globalThis`, which is truly process-global
 * and persists across module re-evaluations.  The database connection,
 * all PRAGMA statements, the schema migration, and the crash-recovery
 * UPDATE all execute **exactly once** per Node.js process.
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR =
  process.env.MEDIAVAULT_DATA_DIR ||
  path.join(os.homedir(), '.mediavault');

const DB_PATH = path.join(DB_DIR, 'mediavault.db');

// Ensure the data directory exists before opening the DB
fs.mkdirSync(DB_DIR, { recursive: true });

// Use globalThis so these survive Next.js module hot-reload in dev.
const g = globalThis as typeof globalThis & {
  __mv_db?: Database.Database;
  __mv_db_initialized?: boolean;
};

export function getDb(): Database.Database {
  // Return cached connection immediately — no re-initialization.
  if (g.__mv_db) return g.__mv_db;

  const db = new Database(DB_PATH);

  // Schema, PRAGMAs, and crash recovery — run ONCE per Node.js process.
  if (!g.__mv_db_initialized) {
    console.log('[MediaVault] Database initialization');
    
    // PRAGMAs
    console.log('[MediaVault] Executing PRAGMA statements (WAL, NORMAL, foreign_keys)');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');

    runMigrations(db);
    g.__mv_db_initialized = true;
  }

  g.__mv_db = db;
  return db;
}

function runMigrations(db: Database.Database): void {
  console.log('[MediaVault] CREATE TABLE IF NOT EXISTS jobs & settings');
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id           TEXT    PRIMARY KEY,
      url          TEXT    NOT NULL,
      provider     TEXT    NOT NULL,
      title        TEXT    NOT NULL DEFAULT '',
      author       TEXT,
      thumbnail    TEXT,
      duration     INTEGER,
      format_id    TEXT    NOT NULL,
      format_label TEXT    NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'queued',
      progress     REAL    NOT NULL DEFAULT 0,
      speed        TEXT,
      eta          TEXT,
      error        TEXT,
      log          TEXT,
      output_path  TEXT,
      file_size    INTEGER,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  console.log('[MediaVault] CREATE INDEX IF NOT EXISTS completed');

  // Safely add columns that may be missing in older databases.
  const existingCols = db.prepare('PRAGMA table_info(jobs)').all() as { name: string }[];
  const colNames = new Set(existingCols.map((c) => c.name));

  const newCols: [string, string][] = [
    ['phase',             "TEXT DEFAULT 'queued'"],
    ['downloaded_bytes',  'INTEGER DEFAULT 0'],
    ['avg_speed',         'TEXT'],
    ['peak_speed',        'TEXT'],
    ['download_duration', 'REAL'],
    ['merge_duration',    'REAL'],
    ['completed_at',      'INTEGER'],
    ['retry_count',       'INTEGER DEFAULT 0'],
  ];

  for (const [name, type] of newCols) {
    if (!colNames.has(name)) {
      try {
        db.exec(`ALTER TABLE jobs ADD COLUMN ${name} ${type}`);
      } catch { /* column already exists */ }
    }
  }

  // Crash recovery — runs ONCE at startup.
  console.log('[MediaVault] Crash recovery: UPDATE jobs SET status = failed');
  const crashResult = db
    .prepare(
      `UPDATE jobs
         SET status = 'failed',
             error  = 'Server restarted while download was in progress',
             updated_at = ?
       WHERE status IN ('active', 'pausing', 'retrying')`
    )
    .run(Date.now());

  if (crashResult.changes > 0) {
    console.log(`[MediaVault] Crash recovery: marked ${crashResult.changes} interrupted job(s) as failed`);
  }

  console.log('[MediaVault] Database initialization complete');
}

