import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { makeApiError } from '@/lib/utils/url';

export const runtime = 'nodejs';

/** POST /api/files/open — open a file or reveal its folder in system file explorer */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetPath = body.path || body.filePath;
    const rawAction: string = body.action || 'open-file';

    if (!targetPath || typeof targetPath !== 'string') {
      return NextResponse.json(makeApiError('path is required', 'MISSING_PARAM'), { status: 400 });
    }

    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) {
      return NextResponse.json(makeApiError(`File or directory does not exist: ${resolved}`, 'NOT_FOUND'), { status: 404 });
    }

    const platform = process.platform;
    const isFolderAction = rawAction === 'open-folder' || rawAction === 'openFolder';
    const isRevealAction = rawAction === 'reveal';

    if (isFolderAction) {
      const folderPath = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
      if (platform === 'win32') {
        exec(`explorer.exe "${folderPath}"`);
      } else if (platform === 'darwin') {
        exec(`open "${folderPath}"`);
      } else {
        exec(`xdg-open "${folderPath}"`);
      }
    } else if (isRevealAction) {
      if (platform === 'win32') {
        exec(`explorer.exe /select,"${resolved}"`);
      } else if (platform === 'darwin') {
        exec(`open -R "${resolved}"`);
      } else {
        exec(`xdg-open "${path.dirname(resolved)}"`);
      }
    } else {
      // Default / open-file: open file with default system application
      if (platform === 'win32') {
        exec(`start "" "${resolved}"`);
      } else if (platform === 'darwin') {
        exec(`open "${resolved}"`);
      } else {
        exec(`xdg-open "${resolved}"`);
      }
    }

    return NextResponse.json({ success: true, path: resolved, action: rawAction });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(makeApiError(msg, 'OPEN_FAILED'), { status: 500 });
  }
}

