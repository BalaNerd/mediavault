/**
 * Filename sanitization, duplicate resolution, and folder safety.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Sanitize a string to be a valid, cross-platform filesystem safe filename.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'media_download';

  // 1. Unicode normalization (NFC)
  let name = filename.normalize('NFC');

  // 2. Replace illegal filename characters (< > : " / \ | ? * and control chars)
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

  // 3. Remove trailing dots and spaces (Windows illegal)
  name = name.trim().replace(/[.\s]+$/, '');

  // 4. Handle Windows reserved filenames
  const parsed = path.parse(name);
  if (WINDOWS_RESERVED_NAMES.test(parsed.name)) {
    parsed.name = `_${parsed.name}`;
    name = parsed.ext ? `${parsed.name}${parsed.ext}` : parsed.name;
  }

  // 5. Truncate max filename length (200 chars while preserving extension)
  const maxLen = 200;
  if (name.length > maxLen) {
    const ext = parsed.ext || '';
    const base = parsed.name.slice(0, maxLen - ext.length - 1);
    name = `${base}${ext}`;
  }

  return name || 'media_download';
}

/**
 * Resolve duplicate filename collision based on settings:
 * - 'rename': file.mp4 -> file (1).mp4 -> file (2).mp4
 * - 'overwrite': returns desiredPath
 * - 'skip': returns desiredPath
 */
export function getUniqueOutputPath(
  desiredPath: string,
  behavior: 'rename' | 'overwrite' | 'skip' = 'rename'
): string {
  if (!fs.existsSync(desiredPath)) return desiredPath;
  if (behavior === 'overwrite' || behavior === 'skip') return desiredPath;

  const parsed = path.parse(desiredPath);
  let counter = 1;
  let candidate = desiredPath;

  while (fs.existsSync(candidate)) {
    candidate = path.join(
      parsed.dir,
      `${parsed.name} (${counter})${parsed.ext}`
    );
    counter++;
  }

  return candidate;
}

/**
 * Validate that download directory exists, is absolute, and is writable.
 * Creates folder recursively if missing and expands home directory (~) on all platforms.
 */
export function validateDownloadFolder(dirPath: string): string {
  try {
    let resolved = dirPath.trim();
    if (resolved.startsWith('~/') || resolved.startsWith('~\\')) {
      resolved = path.join(os.homedir(), resolved.slice(2));
    } else if (resolved === '~') {
      resolved = os.homedir();
    } else {
      resolved = path.resolve(resolved);
    }

    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
    }
    // Verify write permissions
    fs.accessSync(resolved, fs.constants.W_OK);
    return resolved;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Download directory '${dirPath}' is invalid or not writable: ${msg}`);
  }
}

/**
 * Normalize Unicode path for cross-platform matching (NFC).
 */
export function normalizeUnicodePath(filePath: string): string {
  if (!filePath) return filePath;
  return path.normalize(filePath).normalize('NFC');
}

/**
 * Verify if a target file exists on disk, testing direct path,
 * NFC normalization, and NFD normalization.
 */
export function verifyFileExists(targetPath: string): string | null {
  try {
    const resolved = path.resolve(targetPath);
    const variants = [
      resolved,
      resolved.normalize('NFC'),
      resolved.normalize('NFD'),
    ];
    for (const v of variants) {
      if (fs.existsSync(v)) {
        const s = fs.statSync(v);
        if (s.isFile() && s.size > 0) return v;
      }
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Locate a downloaded file in the directory even if special/non-ASCII characters
 * were mangled by console stdout (e.g. `·` becoming replacement char or empty).
 */
export function findMatchingFileInDir(
  dir: string,
  candidatePath: string,
  minMtimeMs?: number
): string | null {
  try {
    if (!fs.existsSync(dir)) return null;
    const base = path.basename(candidatePath);
    const ext = path.extname(base).toLowerCase();
    const baseNoExt = path.basename(base, ext);

    const entries = fs.readdirSync(dir);

    // 1. Exact or Unicode-normalized match
    for (const entry of entries) {
      if (
        entry.normalize('NFC') === base.normalize('NFC') ||
        entry.normalize('NFD') === base.normalize('NFD')
      ) {
        const full = path.join(dir, entry);
        const s = fs.statSync(full);
        if (s.isFile() && s.size > 0) return full;
      }
    }

    // 2. Fuzzy match stripping non-ASCII / corrupted characters (? or \uFFFD)
    const cleanPattern = baseNoExt.replace(/[\uFFFD?]/g, '').trim();
    if (cleanPattern.length >= 3) {
      for (const entry of entries) {
        const entryExt = path.extname(entry).toLowerCase();
        if (ext && entryExt !== ext) continue;
        const entryNoExt = path.basename(entry, entryExt);
        if (entryNoExt.includes(cleanPattern) || cleanPattern.includes(entryNoExt)) {
          const full = path.join(dir, entry);
          const s = fs.statSync(full);
          if (s.isFile() && s.size > 0) return full;
        }
      }
    }

    // 3. Fallback to newest media file in directory matching extension
    if (minMtimeMs) {
      const validExts = new Set(['.mp4', '.mkv', '.webm', '.mp3', '.m4a', '.flac', '.wav', '.opus', '.zip']);
      const candidates = entries
        .map((e) => path.join(dir, e))
        .filter((full) => {
          try {
            const s = fs.statSync(full);
            const fileExt = path.extname(full).toLowerCase();
            const extOk = ext ? fileExt === ext : validExts.has(fileExt);
            return s.isFile() && s.size > 0 && extOk && s.mtimeMs >= (minMtimeMs - 5000);
          } catch {
            return false;
          }
        })
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

      if (candidates.length > 0) {
        return candidates[0];
      }
    }
  } catch { /* ignore */ }
  return null;
}
