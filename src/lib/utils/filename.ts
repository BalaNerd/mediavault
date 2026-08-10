/**
 * Filename sanitization, duplicate resolution, and folder safety.
 */

import fs from 'fs';
import path from 'path';

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
 * Creates folder recursively if missing.
 */
export function validateDownloadFolder(dirPath: string): string {
  try {
    const resolved = path.resolve(dirPath);
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
