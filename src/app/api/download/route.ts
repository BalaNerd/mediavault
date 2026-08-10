import { NextRequest, NextResponse } from 'next/server';
import { getDownloadService } from '@/lib/services/download-service';
import { validateSafeUrl, makeApiError } from '@/lib/utils/url';
import { apiLogger } from '@/lib/logger';

export const runtime = 'nodejs';

/** GET /api/download — list all jobs */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const service = getDownloadService();
    const jobs = await service.listJobs({ status, limit, offset });

    return NextResponse.json({ jobs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list downloads';
    apiLogger.error({ err }, 'List downloads failed');
    return NextResponse.json(makeApiError(msg, 'LIST_FAILED'), { status: 500 });
  }
}

/** POST /api/download — enqueue a new download job */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, formatId, formatLabel, title, author, thumbnail, duration } = body;

    if (!url) {
      return NextResponse.json(makeApiError('Media URL is required', 'INVALID_URL'), { status: 400 });
    }

    const safeCheck = validateSafeUrl(url);
    if (!safeCheck.safe) {
      return NextResponse.json(makeApiError(safeCheck.reason || 'Invalid URL', 'UNSAFE_URL'), { status: 400 });
    }

    if (!formatId) {
      return NextResponse.json(makeApiError('formatId is required', 'MISSING_FORMAT'), { status: 400 });
    }

    const service = getDownloadService();
    const result = await service.enqueueDownload({
      url,
      provider: 'auto',
      title: title || 'Media Download',
      author,
      thumbnail,
      duration,
      formatId,
      formatLabel: formatLabel || formatId,
    });

    apiLogger.info({ jobId: result.job.id, url, isWorker: service.isWorker }, 'Download enqueued');
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to enqueue download';
    apiLogger.error({ err }, 'Enqueue failed');
    const status = msg.includes('Unsupported platform') ? 422 : 500;
    return NextResponse.json(makeApiError(msg, 'ENQUEUE_FAILED'), { status });
  }
}

/** DELETE /api/download — clear completed history */
export async function DELETE() {
  try {
    const service = getDownloadService();
    await service.clearHistory();
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(makeApiError(msg, 'CLEAR_HISTORY_FAILED'), { status: 500 });
  }
}
