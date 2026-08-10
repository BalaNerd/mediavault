/**
 * Settings storage backed by the SQLite `settings` KV table.
 * Provides typed read/write access to AppSettings.
 */

import { getDb } from '@/lib/db';
import { AppSettings, DEFAULT_SETTINGS } from '@/types/settings';
import os from 'os';
import path from 'path';

function resolveDefaultDownloadDir(): string {
  return path.join(os.homedir(), 'Downloads', 'MediaVault');
}

export function getSettings(): AppSettings {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];

  const stored: Partial<AppSettings> = {};
  for (const row of rows) {
    try {
      (stored as Record<string, unknown>)[row.key] = JSON.parse(row.value);
    } catch {
      (stored as Record<string, unknown>)[row.key] = row.value;
    }
  }

  const settings = { ...DEFAULT_SETTINGS, ...stored };

  // Resolve default download dir at runtime if not set
  if (!settings.downloadDir) {
    settings.downloadDir = resolveDefaultDownloadDir();
  }

  return settings;
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const db = getDb();
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );

  const upsertMany = db.transaction((entries: [string, unknown][]) => {
    for (const [key, value] of entries) {
      upsert.run(key, JSON.stringify(value));
    }
  });

  upsertMany(Object.entries(updates));
  return getSettings();
}
