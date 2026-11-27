/**
 * Settings storage backed by the SQLite `settings` KV table.
 * Provides typed read/write access to AppSettings.
 */

import { getDb } from '@/lib/db';
import { AppSettings, DEFAULT_SETTINGS } from '@/types/settings';
import os from 'os';
import path from 'path';

function resolveDefaultDownloadDir(): string {
  const custom = process.env.MEDIA_STORAGE_PATH?.trim();
  if (custom) {
    if (custom.startsWith('~/') || custom.startsWith('~\\')) {
      return path.join(os.homedir(), custom.slice(2));
    }
    if (custom === '~') return os.homedir();
    return path.resolve(custom);
  }
  return path.join(os.homedir(), 'Downloads', 'MediaVault');
}

export function getSettings(): AppSettings {
  try {
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

    // Resolve default download dir at runtime if not set or if home shortcut
    if (!settings.downloadDir) {
      settings.downloadDir = resolveDefaultDownloadDir();
    } else if (settings.downloadDir.startsWith('~/') || settings.downloadDir.startsWith('~\\')) {
      settings.downloadDir = path.join(os.homedir(), settings.downloadDir.slice(2));
    }

    return settings;
  } catch (err) {
    console.warn('[MediaVault] Warning: Failed to load settings from DB, using defaults:', err);
    return {
      ...DEFAULT_SETTINGS,
      downloadDir: resolveDefaultDownloadDir(),
    };
  }
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
