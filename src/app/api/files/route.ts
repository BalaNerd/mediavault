import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/storage/settings';
import { makeApiError } from '@/lib/utils/url';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export interface DownloadedFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
}

/** GET /api/files — list files in the download directory */
export async function GET() {
  const { downloadDir } = getSettings();

  try {
    if (!fs.existsSync(downloadDir)) {
      return NextResponse.json({ files: [], downloadDir });
    }

    const entries = fs.readdirSync(downloadDir, { withFileTypes: true });
    const files: DownloadedFile[] = entries
      .filter((e) => e.isFile())
      .map((e) => {
        const filePath = path.join(downloadDir, e.name);
        const stat = fs.statSync(filePath);
        return {
          name: e.name,
          path: filePath,
          size: stat.size,
          modifiedAt: stat.mtimeMs,
        };
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return NextResponse.json({ files, downloadDir, totalSize });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(makeApiError(msg, 'FILES_LIST_FAILED'), { status: 500 });
  }
}

/** DELETE /api/files — delete a specific file */
export async function DELETE(req: NextRequest) {
  const { downloadDir } = getSettings();

  try {
    const body = await req.json();
    const fileName: string = body?.fileName;

    if (!fileName) {
      return NextResponse.json(makeApiError('fileName is required', 'MISSING_PARAM'), { status: 400 });
    }

    // Security: ensure the file is within the download directory
    const targetPath = path.resolve(path.join(downloadDir, fileName));
    const resolvedDir = path.resolve(downloadDir);

    if (!targetPath.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json(makeApiError('Access denied', 'PATH_TRAVERSAL'), { status: 403 });
    }

    fs.rmSync(targetPath, { force: true });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(makeApiError(msg, 'FILE_DELETE_FAILED'), { status: 500 });
  }
}
