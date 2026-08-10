import { NextResponse } from 'next/server';
import { getDownloadService } from '@/lib/services/download-service';

export const runtime = 'nodejs';

export async function GET() {
  const service = getDownloadService();
  const isWorkerMode = service.isWorker;
  const workerUrl = process.env.MEDIAVAULT_WORKER_URL?.trim();

  let healthData: Record<string, unknown> = {};
  let workerConnected = false;
  let workerError: string | undefined;

  try {
    healthData = await service.getHealth();
    workerConnected = isWorkerMode;
  } catch (err) {
    workerError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    status: workerError ? 'degraded' : 'ok',
    mode: isWorkerMode ? 'worker' : 'local',
    frontend: {
      status: 'OK',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: Math.floor(process.uptime()),
    },
    worker: isWorkerMode
      ? {
          configured: true,
          url: workerUrl,
          connected: workerConnected,
          error: workerError,
        }
      : {
          configured: false,
          mode: 'local_engine',
        },
    ...healthData,
  });
}
