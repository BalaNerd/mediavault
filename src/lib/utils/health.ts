/**
 * System and binary health diagnostic utilities.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { getDb } from '@/lib/db';
import { getSettings } from '@/lib/storage/settings';

export interface BinaryHealth {
  available: boolean;
  version?: string;
  path: string;
  status: 'Installed' | 'Missing';
  warning?: string;
  error?: string;
}

export function checkBinary(binaryPath: string, args: string = '--version'): BinaryHealth {
  try {
    const output = execSync(`"${binaryPath}" ${args}`, {
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .toString()
      .trim();
    const version = output.split('\n')[0] || 'Installed';
    return { available: true, version, path: binaryPath, status: 'Installed' };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { available: false, path: binaryPath, status: 'Missing', error };
  }
}

export function checkPython(): {
  available: boolean;
  version?: string;
  status: 'Installed' | 'Missing';
  warning?: string;
} {
  try {
    const output = execSync('python --version', { timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    const version = output.replace(/^Python\s*/i, '');
    let warning: string | undefined;

    const parts = version.split('.').map((p) => parseInt(p, 10));
    if (parts[0] === 3 && parts[1] < 11) {
      warning = `Python ${version} is deprecated by yt-dlp. Downloads remain functional, but Python 3.11+ is recommended.`;
    }

    return { available: true, version, status: 'Installed', warning };
  } catch {
    return { available: false, status: 'Missing', warning: 'Python not detected on system PATH' };
  }
}

export function getSystemHealth(paths?: {
  ytdlp?: string;
  ffmpeg?: string;
  spotdl?: string;
}): Record<string, unknown> {
  const settings = getSettings();

  const python = checkPython();
  const ytdlp = checkBinary(paths?.ytdlp || settings.ytdlpPath || process.env.YTDLP_PATH || 'yt-dlp', '--version');
  const ffmpeg = checkBinary(paths?.ffmpeg || settings.ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg', '-version');
  const spotdl = checkBinary(paths?.spotdl || settings.spotdlPath || process.env.SPOTDL_PATH || 'spotdl', '--version');

  let sqliteStatus = 'Connected';
  let sqliteError: string | undefined;
  let sqlitePath: string | undefined;
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    sqlitePath = db.name;
  } catch (err) {
    sqliteStatus = 'Error';
    sqliteError = err instanceof Error ? err.message : String(err);
  }

  // Check download directory
  let downloadDirStatus = 'OK';
  let downloadDirError: string | undefined;
  try {
    if (!fs.existsSync(settings.downloadDir)) {
      fs.mkdirSync(settings.downloadDir, { recursive: true });
    }
    fs.accessSync(settings.downloadDir, fs.constants.W_OK);
  } catch (err) {
    downloadDirStatus = 'Error';
    downloadDirError = err instanceof Error ? err.message : String(err);
  }

  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    sqlite: {
      status: sqliteStatus,
      path: sqlitePath,
      error: sqliteError,
    },
    downloadDir: {
      path: settings.downloadDir,
      status: downloadDirStatus,
      error: downloadDirError,
    },
    binaries: {
      python,
      ytdlp,
      ffmpeg,
      spotdl,
    },
  };
}
