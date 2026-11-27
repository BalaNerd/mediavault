/**
 * Standalone MediaVault Download Worker Server.
 *
 * Dedicated long-running Node.js process executing yt-dlp, FFmpeg, SpotDL, and SQLite queue operations.
 * Deployable on Docker, Railway, Render, Fly.io, or VPS.
 */

import http from 'http';
import { parse } from 'url';
import fs from 'fs';
import { LocalDownloadService } from '../lib/services/download-service';
import { validateSafeUrl } from '../lib/utils/url';
import { queueEmitter } from '../lib/queue/download-queue';
import type { EnqueueDownloadPayload, JobUpdatePayload } from '../types/download';

const PORT = parseInt(process.env.PORT || process.env.WORKER_PORT || '4000', 10);
const WORKER_TOKEN = process.env.MEDIAVAULT_WORKER_TOKEN?.trim();

const downloadService = new LocalDownloadService();

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
  });
  res.end(JSON.stringify(data));
}

function verifyAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!WORKER_TOKEN) return true; // No token configured

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { error: 'Unauthorized: Missing Bearer token' });
    return false;
  }

  const token = authHeader.slice(7).trim();
  if (token !== WORKER_TOKEN) {
    sendJson(res, 401, { error: 'Unauthorized: Invalid worker token' });
    return false;
  }

  return true;
}

async function readBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T));
      } catch (err) {
        reject(new Error(`Invalid JSON: ${(err as Error).message}`));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method?.toUpperCase() || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    });
    return res.end();
  }

  // Health endpoint (can be public or authenticated)
  if (pathname === '/health' && method === 'GET') {
    try {
      const health = await downloadService.getHealth();
      return sendJson(res, 200, {
        status: 'ok',
        worker: true,
        uptime: process.uptime(),
        ...health,
      });
    } catch (err) {
      return sendJson(res, 500, { error: (err as Error).message });
    }
  }

  // Authentication check for all other endpoints
  if (!verifyAuth(req, res)) return;

  try {
    // POST /metadata
    if (pathname === '/metadata' && method === 'POST') {
      const body = await readBody<{ url?: string }>(req);
      if (!body.url) return sendJson(res, 400, { error: 'URL is required' });

      const safeCheck = validateSafeUrl(body.url);
      if (!safeCheck.safe) {
        return sendJson(res, 400, { error: safeCheck.reason || 'Invalid URL' });
      }

      const meta = await downloadService.fetchMetadata(body.url);
      return sendJson(res, 200, meta);
    }

    // POST /downloads
    if (pathname === '/downloads' && method === 'POST') {
      const body = await readBody<EnqueueDownloadPayload>(req);
      if (!body.url || !body.formatId) {
        return sendJson(res, 400, { error: 'url and formatId are required' });
      }

      const safeCheck = validateSafeUrl(body.url);
      if (!safeCheck.safe) {
        return sendJson(res, 400, { error: safeCheck.reason || 'Invalid URL' });
      }

      const result = await downloadService.enqueueDownload(body);
      return sendJson(res, 201, result);
    }

    // GET /downloads
    if (pathname === '/downloads' && method === 'GET') {
      const status = parsedUrl.query.status as string | undefined;
      const limit = parseInt(parsedUrl.query.limit as string || '50', 10);
      const offset = parseInt(parsedUrl.query.offset as string || '0', 10);

      const jobs = await downloadService.listJobs({ status, limit, offset });
      return sendJson(res, 200, { jobs });
    }

    // POST /downloads/clear
    if (pathname === '/downloads/clear' && method === 'POST') {
      await downloadService.clearHistory();
      return sendJson(res, 200, { success: true });
    }

    // GET /downloads/:id/progress (SSE)
    const progressMatch = pathname.match(/^\/downloads\/([^/]+)\/progress$/);
    if (progressMatch && method === 'GET') {
      const jobId = progressMatch[1];
      const job = await downloadService.getJob(jobId);
      if (!job) return sendJson(res, 404, { error: 'Job not found' });

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send initial job state
      res.write(`data: ${JSON.stringify(job)}\n\n`);

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return res.end();
      }

      const onUpdate = (payload: JobUpdatePayload) => {
        try {
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
          if (payload.status === 'completed' || payload.status === 'failed' || payload.status === 'cancelled') {
            cleanup();
            res.end();
          }
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        queueEmitter.off(`job:${jobId}`, onUpdate);
      };

      queueEmitter.on(`job:${jobId}`, onUpdate);
      req.on('close', cleanup);
      return;
    }

    // GET /downloads/:id
    const jobMatch = pathname.match(/^\/downloads\/([^/]+)$/);
    if (jobMatch && method === 'GET') {
      const jobId = jobMatch[1];
      const job = await downloadService.getJob(jobId);
      if (!job) return sendJson(res, 404, { error: 'Job not found' });
      return sendJson(res, 200, { job });
    }

    // POST /downloads/:id/cancel
    const cancelMatch = pathname.match(/^\/downloads\/([^/]+)\/cancel$/);
    if (cancelMatch && method === 'POST') {
      const jobId = cancelMatch[1];
      const job = await downloadService.cancelJob(jobId);
      return sendJson(res, 200, { job });
    }

    // POST /downloads/:id/retry
    const retryMatch = pathname.match(/^\/downloads\/([^/]+)\/retry$/);
    if (retryMatch && method === 'POST') {
      const jobId = retryMatch[1];
      const job = await downloadService.retryJob(jobId);
      return sendJson(res, 200, { job });
    }

    // DELETE /downloads/:id
    if (jobMatch && method === 'DELETE') {
      const jobId = jobMatch[1];
      await downloadService.deleteJob(jobId);
      return sendJson(res, 200, { success: true });
    }

    // GET /files/:id
    const fileMatch = pathname.match(/^\/files\/([^/]+)$/);
    if (fileMatch && method === 'GET') {
      const jobId = fileMatch[1];
      const fileInfo = await downloadService.getFile(jobId);

      if (fileInfo.type === 'local') {
        const { filePath, fileName, mimeType, fileSize } = fileInfo;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          if (start >= fileSize || end >= fileSize) {
            res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
            return res.end();
          }

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Access-Control-Allow-Origin': '*',
          });

          return fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
          });

          return fs.createReadStream(filePath).pipe(res);
        }
      }
    }

    // Fallback 404
    return sendJson(res, 404, { error: `Endpoint not found: ${method} ${pathname}` });
  } catch (err) {
    return sendJson(res, 500, { error: (err as Error).message });
  }
});

server.on('error', (err) => {
  console.error('[MediaVault Worker] Server HTTP error:', err);
});

server.listen(PORT, () => {
  console.log(`[MediaVault Worker] Running on http://localhost:${PORT}`);
  if (WORKER_TOKEN) {
    console.log(`[MediaVault Worker] Authentication enabled (Bearer token required)`);
  } else {
    console.log(`[MediaVault Worker] Running in open mode (No token configured)`);
  }
});
