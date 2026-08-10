import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/storage/settings';
import { makeApiError } from '@/lib/utils/url';
import { apiLogger } from '@/lib/logger';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  try {
    const updates = await req.json();

    // Validate downloadDir — prevent path traversal
    if (updates.downloadDir) {
      const resolved = path.resolve(updates.downloadDir);
      // Basic safety: ensure it's an absolute path and not a system dir
      const forbidden = ['/', 'C:\\', 'C:\\Windows', '/etc', '/usr', '/bin'];
      if (forbidden.some((f) => resolved === f || resolved.startsWith(f + path.sep))) {
        return NextResponse.json(
          makeApiError('Download directory points to a protected path', 'INVALID_PATH'),
          { status: 400 }
        );
      }
      updates.downloadDir = resolved;
    }

    // Validate numeric settings
    if (updates.maxConcurrentDownloads !== undefined) {
      const n = parseInt(updates.maxConcurrentDownloads);
      if (isNaN(n) || n < 1 || n > 10) {
        return NextResponse.json(
          makeApiError('maxConcurrentDownloads must be 1–10', 'INVALID_VALUE'),
          { status: 400 }
        );
      }
      updates.maxConcurrentDownloads = n;
    }

    const settings = updateSettings(updates);
    apiLogger.info({ updates }, 'Settings updated');
    return NextResponse.json({ settings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(makeApiError(msg, 'SETTINGS_UPDATE_FAILED'), { status: 500 });
  }
}
