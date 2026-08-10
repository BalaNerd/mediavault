/**
 * SSE (Server-Sent Events) progress stream for a download job.
 *
 * In local mode: Streams from local queueEmitter.
 * In worker mode: Proxies the SSE stream from the remote Download Worker.
 *
 * GET /api/download/[id]/progress
 */

import { NextRequest } from 'next/server';
import { queueEmitter } from '@/lib/queue/download-queue';
import { getDownloadService } from '@/lib/services/download-service';
import type { JobUpdatePayload } from '@/types/download';

export const runtime = 'nodejs';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workerUrl = process.env.MEDIAVAULT_WORKER_URL?.trim();
  const workerToken = process.env.MEDIAVAULT_WORKER_TOKEN?.trim();

  // If worker mode is active, proxy SSE from remote worker
  if (workerUrl) {
    const targetUrl = `${workerUrl.replace(/\/+$/, '')}/downloads/${id}/progress`;
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
    };
    if (workerToken) {
      headers.Authorization = `Bearer ${workerToken}`;
    }

    try {
      const workerRes = await fetch(targetUrl, {
        headers,
        signal: req.signal,
      });

      if (!workerRes.ok || !workerRes.body) {
        return new Response('Worker progress stream unavailable', { status: workerRes.status || 502 });
      }

      return new Response(workerRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch {
      return new Response('Failed to connect to worker progress stream', { status: 502 });
    }
  }

  // LOCAL MODE
  const service = getDownloadService();
  const job = await service.getJob(id);

  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  // If already terminal, return state immediately
  if (TERMINAL_STATUSES.has(job.status)) {
    const data = `data: ${JSON.stringify(job)}\n\n`;
    return new Response(data, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send current state immediately upon connection
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(job)}\n\n`)
      );

      function onUpdate(payload: JobUpdatePayload) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );

          // Close stream when terminal state is reached
          if (payload.status && TERMINAL_STATUSES.has(payload.status)) {
            cleanup();
            controller.close();
          }
        } catch {
          cleanup();
        }
      }

      // Heartbeat every 15s to keep connection active
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, 15_000);

      function cleanup() {
        queueEmitter.off(`job:${id}`, onUpdate);
        clearInterval(heartbeat);
      }

      queueEmitter.on(`job:${id}`, onUpdate);

      // Clean up if client disconnects
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
