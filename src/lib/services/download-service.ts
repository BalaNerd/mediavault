/**
 * Unified DownloadService Abstraction.
 *
 * HYBRID MODE:
 * - Local Mode (Default): Direct execution using local providers, download queue, and SQLite.
 * - Worker / Production Mode: Proxying requests to the dedicated Download Worker (MEDIAVAULT_WORKER_URL) with Bearer token authentication.
 */

import type { MediaMetadata, DownloadJob, EnqueueDownloadPayload } from '@/types/download';
import { getProvider } from '@/lib/providers/registry';
import {
  enqueueJob,
  getJob,
  listJobs,
  cancelJob,
  retryJob,
  deleteJob,
  clearHistory,
} from '@/lib/queue/download-queue';
import { getSettings } from '@/lib/storage/settings';
import { getSystemHealth } from '@/lib/utils/health';
import { apiLogger } from '@/lib/logger';
import path from 'path';
import fs from 'fs';

export interface IDownloadService {
  isWorker: boolean;
  fetchMetadata(url: string): Promise<MediaMetadata>;
  enqueueDownload(payload: EnqueueDownloadPayload): Promise<{ job: DownloadJob }>;
  getJob(id: string): Promise<DownloadJob | null>;
  listJobs(options?: { status?: string; limit?: number; offset?: number }): Promise<DownloadJob[]>;
  cancelJob(id: string): Promise<DownloadJob>;
  retryJob(id: string): Promise<DownloadJob>;
  deleteJob(id: string): Promise<void>;
  clearHistory(): Promise<void>;
  getHealth(): Promise<Record<string, unknown>>;
  getFile(id: string, range?: string): Promise<
    | { type: 'local'; filePath: string; fileName: string; mimeType: string; fileSize: number }
    | { type: 'remote'; response: Response }
  >;
}

export class LocalDownloadService implements IDownloadService {
  readonly isWorker = false;

  async fetchMetadata(url: string): Promise<MediaMetadata> {
    const provider = getProvider(url);
    if (!provider) {
      throw new Error(
        'Unsupported platform. MediaVault officially supports YouTube, Instagram, Facebook, Spotify, and Direct Media URLs (.mp3, .mp4, etc.).'
      );
    }
    const meta = await provider.fetchMetadata(url);
    return {
      ...meta,
      capabilities: provider.capabilities,
    };
  }

  async enqueueDownload(payload: EnqueueDownloadPayload): Promise<{ job: DownloadJob }> {
    const provider = getProvider(payload.url);
    if (!provider) {
      throw new Error(
        'Unsupported platform. MediaVault officially supports YouTube, Instagram, Facebook, Spotify, and Direct Media URLs.'
      );
    }

    const job = enqueueJob({
      url: payload.url,
      provider: provider.name,
      title: payload.title || 'Media Download',
      author: payload.author,
      thumbnail: payload.thumbnail,
      duration: payload.duration,
      formatId: payload.formatId,
      formatLabel: payload.formatLabel || payload.formatId,
    });

    return { job };
  }

  async getJob(id: string): Promise<DownloadJob | null> {
    const job = getJob(id);
    return job || null;
  }

  async listJobs(options: { status?: string; limit?: number; offset?: number } = {}): Promise<DownloadJob[]> {
    const { status, limit = 50, offset = 0 } = options;
    return listJobs({
      status: status as DownloadJob['status'] | undefined,
      limit,
      offset,
    });
  }

  async cancelJob(id: string): Promise<DownloadJob> {
    const success = cancelJob(id);
    if (!success) {
      throw new Error('Job cannot be cancelled in its current state.');
    }
    const job = getJob(id);
    if (!job) throw new Error('Job not found after cancellation.');
    return job;
  }

  async retryJob(id: string): Promise<DownloadJob> {
    const success = retryJob(id);
    if (!success) {
      throw new Error('Job cannot be retried in its current state.');
    }
    const job = getJob(id);
    if (!job) throw new Error('Job not found after retry.');
    return job;
  }

  async deleteJob(id: string): Promise<void> {
    const success = deleteJob(id);
    if (!success) {
      throw new Error('Job not found or could not be deleted.');
    }
  }

  async clearHistory(): Promise<void> {
    clearHistory();
  }

  async getHealth(): Promise<Record<string, unknown>> {
    const settings = getSettings();
    return getSystemHealth({
      ytdlp: settings.ytdlpPath,
      ffmpeg: settings.ffmpegPath,
      spotdl: settings.spotdlPath,
    });
  }

  async getFile(id: string): Promise<
    | { type: 'local'; filePath: string; fileName: string; mimeType: string; fileSize: number }
    | { type: 'remote'; response: Response }
  > {
    const job = await this.getJob(id);
    if (!job) {
      throw new Error('Download job not found.');
    }
    if (job.status !== 'completed' || !job.outputPath) {
      throw new Error('Media file is not completed or output path is missing.');
    }

    const resolvedPath = path.resolve(job.outputPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error('The downloaded media file could not be found on disk.');
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error('The media file is empty or invalid.');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.m4v': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/opus',
    };

    return {
      type: 'local',
      filePath: resolvedPath,
      fileName: path.basename(resolvedPath),
      mimeType: mimeTypes[ext] || 'application/octet-stream',
      fileSize: stat.size,
    };
  }
}

export class WorkerDownloadService implements IDownloadService {
  readonly isWorker = true;
  private readonly baseUrl: string;
  private readonly token: string | undefined;

  constructor(workerUrl: string, token?: string) {
    this.baseUrl = workerUrl.replace(/\/+$/, '');
    this.token = token;
  }

  private getHeaders(contentType: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = 'application/json';
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      ...this.getHeaders(options.body !== undefined),
      ...(options.headers as Record<string, string> || {}),
    };

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err) {
      apiLogger.error({ url, err }, 'Worker connection failed');
      throw new Error(`Failed to connect to MediaVault Download Worker at ${this.baseUrl}. Is the worker running?`);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || `Worker returned HTTP ${res.status}: ${res.statusText}`;
      throw new Error(msg);
    }

    return data as T;
  }

  async fetchMetadata(url: string): Promise<MediaMetadata> {
    return this.request<MediaMetadata>('/metadata', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async enqueueDownload(payload: EnqueueDownloadPayload): Promise<{ job: DownloadJob }> {
    return this.request<{ job: DownloadJob }>('/downloads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getJob(id: string): Promise<DownloadJob | null> {
    try {
      const data = await this.request<{ job: DownloadJob }>(`/downloads/${id}`);
      return data.job;
    } catch {
      return null;
    }
  }

  async listJobs(options: { status?: string; limit?: number; offset?: number } = {}): Promise<DownloadJob[]> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));

    const data = await this.request<{ jobs: DownloadJob[] }>(`/downloads?${params.toString()}`);
    return data.jobs || [];
  }

  async cancelJob(id: string): Promise<DownloadJob> {
    const data = await this.request<{ job: DownloadJob }>(`/downloads/${id}/cancel`, {
      method: 'POST',
    });
    return data.job;
  }

  async retryJob(id: string): Promise<DownloadJob> {
    const data = await this.request<{ job: DownloadJob }>(`/downloads/${id}/retry`, {
      method: 'POST',
    });
    return data.job;
  }

  async deleteJob(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/downloads/${id}`, {
      method: 'DELETE',
    });
  }

  async clearHistory(): Promise<void> {
    await this.request<{ success: boolean }>('/downloads/clear', {
      method: 'POST',
    });
  }

  async getHealth(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/health');
  }

  async getFile(id: string, range?: string): Promise<
    | { type: 'local'; filePath: string; fileName: string; mimeType: string; fileSize: number }
    | { type: 'remote'; response: Response }
  > {
    const fileUrl = `${this.baseUrl}/files/${id}`;
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (range) headers['Range'] = range;

    const res = await fetch(fileUrl, { headers });
    if (!res.ok) {
      throw new Error(`Worker file streaming failed with HTTP ${res.status}`);
    }

    return { type: 'remote', response: res };
  }
}

export function getDownloadService(): IDownloadService {
  const workerUrl = process.env.MEDIAVAULT_WORKER_URL?.trim();
  const workerToken = process.env.MEDIAVAULT_WORKER_TOKEN?.trim();

  if (workerUrl) {
    return new WorkerDownloadService(workerUrl, workerToken);
  }

  return new LocalDownloadService();
}
