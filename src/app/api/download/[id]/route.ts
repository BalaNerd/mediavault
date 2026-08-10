import { NextRequest, NextResponse } from 'next/server';
import { getDownloadService } from '@/lib/services/download-service';
import { makeApiError } from '@/lib/utils/url';

export const runtime = 'nodejs';

/** GET /api/download/[id] — get a single job */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = getDownloadService();
  const job = await service.getJob(id);
  if (!job) {
    return NextResponse.json(makeApiError('Job not found', 'NOT_FOUND'), { status: 404 });
  }
  return NextResponse.json({ job });
}

/** PATCH /api/download/[id] — cancel or retry a job */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  const service = getDownloadService();

  try {
    if (action === 'retry') {
      const job = await service.retryJob(id);
      return NextResponse.json({ job });
    }

    if (action === 'cancel') {
      const job = await service.cancelJob(id);
      return NextResponse.json({ job });
    }

    return NextResponse.json(makeApiError('Unknown action', 'UNKNOWN_ACTION'), { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Action failed';
    return NextResponse.json(makeApiError(msg, 'ACTION_FAILED'), { status: 409 });
  }
}

/** DELETE /api/download/[id] — remove a job */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = getDownloadService();
  try {
    await service.deleteJob(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete job';
    return NextResponse.json(makeApiError(msg, 'DELETE_FAILED'), { status: 404 });
  }
}
