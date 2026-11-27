/**
 * Download queue manager for MediaVault.
 *
 * Implements:
 * - Process-global singleton state via globalThis for reliable SSE event propagation
 * - Pre-flight download folder resolution and validation
 * - Tree-kill process cancellation (taskkill on Windows)
 * - Safe retry mechanisms
 * - Authoritative filesystem verification (size > 0, isFile)
 */

import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { ChildProcess, execSync } from 'child_process';

import { getDb } from '@/lib/db';
import { getSettings } from '@/lib/storage/settings';
import { getProviderByName } from '@/lib/providers/registry';
import { downloadLogger } from '@/lib/logger';
import { generateId, formatBytes } from '@/lib/utils/format';
import { validateDownloadFolder, sanitizeFilename } from '@/lib/utils/filename';
import type { DownloadJob, DownloadStatus, DownloadPhase, JobUpdatePayload } from '@/types/download';

interface ActiveJob {
  jobId: string;
  process: ChildProcess | null;
  timeoutTimer?: NodeJS.Timeout;
}

// GlobalThis singleton guarantees across Next.js dev and multi-module bundles
const g = globalThis as typeof globalThis & {
  __mv_queue_emitter?: EventEmitter;
  __mv_active_jobs?: Map<string, ActiveJob>;
  __mv_is_processing?: boolean;
};

if (!g.__mv_queue_emitter) {
  g.__mv_queue_emitter = new EventEmitter();
  g.__mv_queue_emitter.setMaxListeners(250);
  g.__mv_queue_emitter.on('error', (err) => {
    downloadLogger.error({ err }, 'Unhandled queueEmitter error');
  });
}

if (!g.__mv_active_jobs) {
  g.__mv_active_jobs = new Map<string, ActiveJob>();
}

export const queueEmitter: EventEmitter = g.__mv_queue_emitter;
const activeJobs: Map<string, ActiveJob> = g.__mv_active_jobs;

function dbToJob(row: Record<string, unknown>): DownloadJob {
  return {
    id: row.id as string,
    url: row.url as string,
    provider: row.provider as string,
    title: (row.title as string) || '',
    author: row.author as string | undefined,
    thumbnail: row.thumbnail as string | undefined,
    duration: row.duration as number | undefined,
    formatId: row.format_id as string,
    formatLabel: row.format_label as string,
    status: row.status as DownloadStatus,
    phase: (row.phase as DownloadPhase) || (row.status as DownloadPhase) || 'queued',
    progress: typeof row.progress === 'number' ? row.progress : 0,
    speed: row.speed as string | undefined,
    eta: row.eta as string | undefined,
    error: row.error as string | undefined,
    log: row.log as string | undefined,
    outputPath: row.output_path as string | undefined,
    fileSize: row.file_size as number | undefined,
    downloadedBytes: row.downloaded_bytes as number | undefined,
    avgSpeed: row.avg_speed as string | undefined,
    peakSpeed: row.peak_speed as string | undefined,
    downloadDuration: row.download_duration as number | undefined,
    mergeDuration: row.merge_duration as number | undefined,
    completedAt: row.completed_at as number | undefined,
    retryCount: (row.retry_count as number) || 0,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function updateJobInDb(jobId: string, payload: JobUpdatePayload): void {
  try {
    const db = getDb();
    const now = Date.now();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (payload.status !== undefined) { fields.push('status = ?'); values.push(payload.status); }
    if (payload.phase !== undefined) { fields.push('phase = ?'); values.push(payload.phase); }
    if (payload.progress !== undefined) { fields.push('progress = ?'); values.push(payload.progress); }
    if (payload.speed !== undefined) { fields.push('speed = ?'); values.push(payload.speed); }
    if (payload.eta !== undefined) { fields.push('eta = ?'); values.push(payload.eta); }
    if (payload.error !== undefined) { fields.push('error = ?'); values.push(payload.error); }
    if (payload.log !== undefined) { fields.push('log = ?'); values.push(payload.log); }
    if (payload.outputPath !== undefined) { fields.push('output_path = ?'); values.push(payload.outputPath); }
    if (payload.fileSize !== undefined) { fields.push('file_size = ?'); values.push(payload.fileSize); }
    if (payload.downloadedBytes !== undefined) { fields.push('downloaded_bytes = ?'); values.push(payload.downloadedBytes); }
    if (payload.avgSpeed !== undefined) { fields.push('avg_speed = ?'); values.push(payload.avgSpeed); }
    if (payload.peakSpeed !== undefined) { fields.push('peak_speed = ?'); values.push(payload.peakSpeed); }
    if (payload.downloadDuration !== undefined) { fields.push('download_duration = ?'); values.push(payload.downloadDuration); }
    if (payload.mergeDuration !== undefined) { fields.push('merge_duration = ?'); values.push(payload.mergeDuration); }
    if (payload.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(payload.completedAt); }
    if (payload.retryCount !== undefined) { fields.push('retry_count = ?'); values.push(payload.retryCount); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(jobId);

    db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  } catch (err) {
    downloadLogger.error({ jobId, err }, 'Failed to update job in DB');
  }
}

function emitUpdate(jobId: string, payload: JobUpdatePayload): void {
  queueEmitter.emit(`job:${jobId}`, payload);
  queueEmitter.emit('queue:updated', { jobId, ...payload });
}

export function enqueueJob(params: {
  url: string;
  provider: string;
  title: string;
  author?: string;
  thumbnail?: string;
  duration?: number;
  formatId: string;
  formatLabel: string;
}): DownloadJob {
  const db = getDb();
  const now = Date.now();
  const id = generateId();

  db.prepare(`
    INSERT INTO jobs (id, url, provider, title, author, thumbnail, duration,
                      format_id, format_label, status, phase, progress, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'queued', 0, ?, ?)
  `).run(
    id, params.url, params.provider, params.title, params.author ?? null,
    params.thumbnail ?? null, params.duration ?? null,
    params.formatId, params.formatLabel, now, now
  );

  downloadLogger.info({ id, url: params.url, provider: params.provider }, 'Job enqueued');
  processQueue().catch((err) => downloadLogger.error(err, 'Queue processor error'));

  return getJob(id)!;
}

export function getJob(id: string): DownloadJob | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? dbToJob(row) : null;
}

export function listJobs(opts?: {
  status?: DownloadStatus | DownloadStatus[];
  limit?: number;
  offset?: number;
}): DownloadJob[] {
  const db = getDb();
  const { status, limit = 100, offset = 0 } = opts ?? {};

  let query = 'SELECT * FROM jobs';
  const params: unknown[] = [];

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    query += ` WHERE status IN (${statuses.map(() => '?').join(', ')})`;
    params.push(...statuses);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map(dbToJob);
}

export function cancelJob(id: string): boolean {
  const job = getJob(id);
  if (!job) return false;
  if (job.status === 'completed' || job.status === 'cancelled') return false;

  const active = activeJobs.get(id);
  if (active?.timeoutTimer) clearTimeout(active.timeoutTimer);

  // Trigger abort controller for direct HTTP streams
  const abortCtrl = (global as Record<string, unknown>)[`__mv_abort_${id}`] as AbortController | undefined;
  if (abortCtrl) {
    try { abortCtrl.abort(); } catch { /* ignore */ }
    delete (global as Record<string, unknown>)[`__mv_abort_${id}`];
  }

  // Kill child process tree
  const globalProc = (global as Record<string, unknown>)[`__mv_proc_${id}`] as ChildProcess | undefined;
  const proc = active?.process || globalProc;

  if (proc && proc.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${proc.pid} /f /t`, { stdio: 'ignore' });
      } else {
        proc.kill('SIGKILL');
      }
    } catch {
      try { proc.kill('SIGTERM'); } catch { /* already dead */ }
    }
  }

  activeJobs.delete(id);
  delete (global as Record<string, unknown>)[`__mv_proc_${id}`];

  updateJobInDb(id, { status: 'cancelled', phase: 'cancelled', updatedAt: Date.now() });
  emitUpdate(id, { status: 'cancelled', phase: 'cancelled' });
  downloadLogger.info({ id }, 'Job cancelled');
  return true;
}

export function retryJob(id: string): boolean {
  const job = getJob(id);
  if (!job) return false;
  if (job.status !== 'failed' && job.status !== 'cancelled') return false;

  const currentRetry = (job.retryCount || 0) + 1;

  updateJobInDb(id, {
    status: 'queued',
    phase: 'queued',
    progress: 0,
    error: undefined,
    log: undefined,
    retryCount: currentRetry,
  });
  emitUpdate(id, { status: 'queued', phase: 'queued', progress: 0, retryCount: currentRetry });
  downloadLogger.info({ id, retryCount: currentRetry }, 'Job re-queued for retry');

  processQueue().catch((err) => downloadLogger.error(err, 'Queue processor error'));
  return true;
}

export function deleteJob(id: string): boolean {
  cancelJob(id);
  const db = getDb();
  const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  return result.changes > 0;
}

export function clearHistory(): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM jobs WHERE status IN ('completed', 'failed', 'cancelled')").run();
  return result.changes;
}

async function processQueue(): Promise<void> {
  if (g.__mv_is_processing) return;
  g.__mv_is_processing = true;

  try {
    while (true) {
      const settings = getSettings();
      const maxConcurrent = settings.maxConcurrentDownloads || 3;

      if (activeJobs.size >= maxConcurrent) break;

      const db = getDb();
      const nextRow = db
        .prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1")
        .get() as Record<string, unknown> | undefined;

      if (!nextRow) break;

      const job = dbToJob(nextRow);
      await startJob(job);
    }
  } finally {
    g.__mv_is_processing = false;
  }
}

async function startJob(job: DownloadJob): Promise<void> {
  const settings = getSettings();
  const provider = getProviderByName(job.provider);

  if (!provider) {
    const errorMsg = `Provider '${job.provider}' not available`;
    updateJobInDb(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
    emitUpdate(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
    return;
  }

  // Validate and resolve download directory
  let resolvedDownloadDir: string;
  try {
    resolvedDownloadDir = validateDownloadFolder(settings.downloadDir);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    updateJobInDb(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
    emitUpdate(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
    return;
  }

  // Handle duplicate skip behavior
  if (settings.duplicateBehavior === 'skip') {
    const safeTitle = sanitizeFilename(job.title);
    const possibleExts = ['.mp4', '.mkv', '.webm', '.mp3', '.m4a', '.flac', '.wav'];
    for (const ext of possibleExts) {
      const checkPath = path.join(resolvedDownloadDir, `${safeTitle}${ext}`);
      if (fs.existsSync(checkPath)) {
        const errorMsg = `Download skipped: file already exists (${checkPath})`;
        updateJobInDb(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
        emitUpdate(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
        return;
      }
    }
  }

  updateJobInDb(job.id, { status: 'active', phase: 'preparing', progress: 0 });
  emitUpdate(job.id, { status: 'active', phase: 'preparing', progress: 0 });
  downloadLogger.info({ id: job.id, provider: job.provider, dir: resolvedDownloadDir }, 'Starting download job');

  let maxSpeedSeen = '';
  let logBuffer = `[MediaVault Log]\nProvider: ${job.provider}\nJob ID: ${job.id}\nURL: ${job.url}\nFormat: ${job.formatId}\nDirectory: ${resolvedDownloadDir}\nStarted: ${new Date().toISOString()}\n\n`;

  // Timeout protection
  const timeoutMs = (settings.processTimeoutSeconds || 900) * 1000;
  const timeoutTimer = setTimeout(() => {
    downloadLogger.warn({ jobId: job.id }, 'Job process timeout reached');
    cancelJob(job.id);
    const errorMsg = `Download timed out after ${settings.processTimeoutSeconds || 900}s`;
    updateJobInDb(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
    emitUpdate(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
  }, timeoutMs);

  activeJobs.set(job.id, { jobId: job.id, process: null, timeoutTimer });

  const downloadStartTime = Date.now();
  let exitCode = 0;

  try {
    const rawOutputPath = await provider.download(
      job.id,
      job.url,
      job.formatId,
      resolvedDownloadDir,
      settings.ffmpegPath,
      (progress, speed, eta, phase) => {
        const p = progress < 0 ? -1 : Math.round(progress);
        const currentPhase = phase || (p >= 92 ? 'merging' : 'downloading_video');

        if (speed) maxSpeedSeen = speed;

        updateJobInDb(job.id, {
          progress: p < 0 ? 0 : p,
          phase: currentPhase,
          speed,
          eta,
        });

        emitUpdate(job.id, {
          progress: p < 0 ? 0 : p,
          phase: currentPhase,
          speed,
          eta,
        });
      },
      (line) => {
        logBuffer += line;
      }
    );

    clearTimeout(timeoutTimer);

    // Verify Authoritative Final File
    if (!rawOutputPath || !fs.existsSync(rawOutputPath)) {
      throw new Error(`Download finished but output file could not be verified on disk: '${rawOutputPath}'`);
    }

    const stat = await fs.promises.stat(rawOutputPath);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Download produced an invalid or empty file (0 bytes): '${rawOutputPath}'`);
    }

    const fileSize = stat.size;
    const endTime = Date.now();
    const downloadDuration = Math.max(0.1, (endTime - downloadStartTime) / 1000);

    logBuffer += `\n[Execution Summary]\n`;
    logBuffer += `Exit Code: 0\n`;
    logBuffer += `Duration: ${downloadDuration.toFixed(2)}s\n`;
    logBuffer += `Final Output: ${rawOutputPath}\n`;
    logBuffer += `Verified File Size: ${formatBytes(fileSize)}\n`;

    const avgSpeedStr = fileSize > 0
      ? `${formatBytes(Math.round(fileSize / downloadDuration))}/s`
      : (maxSpeedSeen || undefined);

    updateJobInDb(job.id, {
      status: 'completed',
      phase: 'completed',
      progress: 100,
      outputPath: rawOutputPath,
      fileSize,
      downloadedBytes: fileSize,
      avgSpeed: avgSpeedStr,
      peakSpeed: maxSpeedSeen || avgSpeedStr,
      downloadDuration,
      completedAt: endTime,
      speed: undefined,
      eta: undefined,
      log: logBuffer.slice(-10000),
    });

    emitUpdate(job.id, {
      status: 'completed',
      phase: 'completed',
      progress: 100,
      outputPath: rawOutputPath,
      fileSize,
      downloadedBytes: fileSize,
      avgSpeed: avgSpeedStr,
      completedAt: endTime,
    });

    downloadLogger.info({ id: job.id, outputPath: rawOutputPath, fileSize }, 'Job completed successfully');

  } catch (err) {
    clearTimeout(timeoutTimer);
    exitCode = 1;
    const endTime = Date.now();
    const downloadDuration = Math.max(0.1, (endTime - downloadStartTime) / 1000);
    const errorMsg = err instanceof Error ? err.message : String(err);

    logBuffer += `\n[Execution Summary]\n`;
    logBuffer += `Exit Code: ${exitCode}\n`;
    logBuffer += `Duration: ${downloadDuration.toFixed(2)}s\n`;
    logBuffer += `Error: ${errorMsg}\n`;

    updateJobInDb(job.id, {
      status: 'failed',
      phase: 'failed',
      error: errorMsg,
      log: logBuffer.slice(-12000),
    });

    emitUpdate(job.id, { status: 'failed', phase: 'failed', error: errorMsg });
    downloadLogger.error({ id: job.id, error: errorMsg, duration: downloadDuration }, 'Job failed');
  } finally {
    const active = activeJobs.get(job.id);
    if (active?.timeoutTimer) clearTimeout(active.timeoutTimer);
    activeJobs.delete(job.id);
    processQueue().catch(() => {});
  }
}

export function bootstrapQueue(): void {
  downloadLogger.info('Download queue bootstrap initialized');
  processQueue().catch((err) =>
    downloadLogger.error(err, 'Bootstrap queue error')
  );
}
