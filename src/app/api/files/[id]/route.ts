/**
 * Secure file serving endpoint for downloaded media.
 *
 * GET /api/files/[id]
 *
 * Streams completed media files to browsers / mobile devices
 * with support for HTTP Range requests and proper Content-Disposition.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getDownloadService } from '@/lib/services/download-service';
import { makeApiError } from '@/lib/utils/url';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getDownloadService();
    const rangeHeader = req.headers.get('range') || undefined;

    const fileResult = await service.getFile(id, rangeHeader);

    // If remote worker response
    if (fileResult.type === 'remote') {
      const { response } = fileResult;
      const headers = new Headers();
      response.headers.forEach((value, key) => {
        headers.set(key, value);
      });
      return new NextResponse(response.body, {
        status: response.status,
        headers,
      });
    }

    // Local file streaming
    const { filePath, fileName, mimeType, fileSize } = fileResult;

    // Handle Range Requests (Partial Content)
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      const nodeStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(nodeStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    }

    // Full File Stream
    const stream = fs.createReadStream(filePath);
    const nodeStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(nodeStream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to serve file';
    return NextResponse.json(makeApiError(msg, 'FILE_SERVE_ERROR'), { status: 404 });
  }
}
