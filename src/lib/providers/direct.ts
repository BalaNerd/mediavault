/**
 * Direct Media Provider — downloads direct audio/video URLs via HTTP/HTTPS streams.
 *
 * Supports: .mp3, .mp4, .m4a, .webm, .wav, .ogg, .flac, .mov, .mkv, .aac, .opus
 * and URLs serving audio/* or video/* content types.
 */

import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { BaseProvider } from './base';
import type { MediaMetadata, DownloadFormat, DownloadPhase } from '@/types/download';
import type { ProviderCapabilities } from '@/types/provider';
import { sanitizeFilename, getUniqueOutputPath } from '@/lib/utils/filename';
import { formatBytes } from '@/lib/utils/format';
import { providerLogger } from '@/lib/logger';

const DIRECT_EXTENSIONS = new Set([
  '.mp3', '.mp4', '.m4a', '.webm', '.wav', '.ogg',
  '.flac', '.mov', '.mkv', '.aac', '.opus', '.m4v'
]);

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.opus'
]);

export class DirectMediaProvider extends BaseProvider {
  readonly name = 'direct';

  readonly capabilities: ProviderCapabilities = {
    supportsAudioOnly: true,
    supportsVideoFormats: true,
    supportsPause: false,
    supportsMetadata: true,
  };

  canHandle(url: string): boolean {
    if (!/^https?:\/\//i.test(url)) return false;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      const ext = path.extname(pathname);
      if (DIRECT_EXTENSIONS.has(ext)) return true;
      return false;
    } catch {
      return false;
    }
  }

  private extractFilenameFromHeaders(contentDisposition: string | null, url: string): string {
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          return decodeURIComponent(utf8Match[1].trim());
        } catch { /* ignore */ }
      }
      const regularMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (regularMatch && regularMatch[1]) {
        return regularMatch[1].trim();
      }
    }

    try {
      const parsed = new URL(url);
      const basename = path.basename(parsed.pathname);
      if (basename && basename.includes('.')) {
        return decodeURIComponent(basename);
      }
    } catch { /* ignore */ }

    return 'direct_media_download';
  }

  async fetchMetadata(url: string): Promise<MediaMetadata> {
    providerLogger.info({ url }, 'Fetching direct media metadata');

    let contentType = '';
    let contentLength = 0;
    let filename = '';

    try {
      // Try HEAD first
      let res = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'MediaVault/1.0 (Direct Downloader)',
        },
      });

      // If HEAD is not allowed (405 or 403), fallback to GET with Range
      if (!res.ok || res.status === 405) {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'MediaVault/1.0 (Direct Downloader)',
            Range: 'bytes=0-0',
          },
        });
      }

      contentType = res.headers.get('content-type') || '';
      const cl = res.headers.get('content-length') || res.headers.get('content-range')?.split('/')[1] || '0';
      contentLength = parseInt(cl, 10) || 0;
      filename = this.extractFilenameFromHeaders(res.headers.get('content-disposition'), url);
    } catch (err) {
      providerLogger.warn({ url, err }, 'Failed to probe HEAD, using URL path fallback');
      filename = this.extractFilenameFromHeaders(null, url);
    }

    let ext = path.extname(filename).toLowerCase().replace(/^\./, '');
    if (!ext) {
      if (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3')) ext = 'mp3';
      else if (contentType.includes('video/mp4')) ext = 'mp4';
      else if (contentType.includes('audio/mp4') || contentType.includes('audio/x-m4a')) ext = 'm4a';
      else if (contentType.includes('video/webm')) ext = 'webm';
      else if (contentType.includes('audio/ogg')) ext = 'ogg';
      else if (contentType.includes('audio/wav')) ext = 'wav';
      else if (contentType.includes('audio/flac')) ext = 'flac';
      else ext = 'mp4';
    }

    const isAudioOnly = AUDIO_EXTENSIONS.has(`.${ext}`) || contentType.startsWith('audio/');
    const cleanTitle = path.basename(filename, path.extname(filename)) || 'Direct Media';

    const formats: DownloadFormat[] = [
      {
        id: 'direct-original',
        label: `${ext.toUpperCase()} (${isAudioOnly ? 'Audio' : 'Video'}) — Direct Stream`,
        ext,
        filesize: contentLength > 0 ? contentLength : undefined,
        isAudioOnly,
        note: contentLength > 0 ? formatBytes(contentLength) : 'Direct HTTP Stream',
      },
    ];

    return {
      url,
      provider: this.name,
      title: cleanTitle,
      formats,
    };
  }

  async download(
    jobId: string,
    url: string,
    _formatId: string,
    outputDir: string,
    _ffmpegPath: string | undefined,
    onProgress: (progress: number, speed: string, eta: string, phase?: DownloadPhase) => void,
    onLog: (line: string) => void
  ): Promise<string> {
    const resolvedDir = path.resolve(outputDir);
    await fs.promises.mkdir(resolvedDir, { recursive: true });

    onProgress(0, '', '', 'preparing');
    onLog(`[MediaVault Direct] Starting direct HTTP download for Job: ${jobId}\n`);
    onLog(`[MediaVault Direct] URL: ${url}\n`);
    onLog(`[MediaVault Direct] Output Directory: ${resolvedDir}\n`);

    const abortController = new AbortController();
    (global as Record<string, unknown>)[`__mv_abort_${jobId}`] = abortController;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MediaVault/1.0 (Direct Downloader)',
        },
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const contentLengthHeader = res.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const contentDisposition = res.headers.get('content-disposition');
      const rawFilename = this.extractFilenameFromHeaders(contentDisposition, url);
      const safeFilename = sanitizeFilename(rawFilename);

      const desiredPath = path.join(resolvedDir, safeFilename);
      const targetPath = getUniqueOutputPath(desiredPath, 'rename');
      const tempPath = `${targetPath}.${jobId}.mvtmp`;

      onLog(`[MediaVault Direct] Target output file: ${targetPath}\n`);
      onLog(`[MediaVault Direct] Total file size: ${totalBytes > 0 ? formatBytes(totalBytes) : 'Unknown'}\n`);
      onProgress(0, 'Starting download...', '', 'downloading');

      if (!res.body) {
        throw new Error('Response body is empty');
      }

      let downloadedBytes = 0;
      let lastTime = Date.now();
      let lastBytes = 0;
      let speedStr = '';
      let etaStr = '';

      const nodeReadable = Readable.fromWeb(res.body as import('stream/web').ReadableStream<Uint8Array>);

      nodeReadable.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        const deltaMs = now - lastTime;

        if (deltaMs >= 300) {
          const deltaBytes = downloadedBytes - lastBytes;
          const bytesPerSec = (deltaBytes / deltaMs) * 1000;
          speedStr = `${formatBytes(bytesPerSec)}/s`;

          if (totalBytes > 0) {
            const remainingBytes = totalBytes - downloadedBytes;
            const remainingSec = bytesPerSec > 0 ? Math.round(remainingBytes / bytesPerSec) : 0;
            const etaMin = Math.floor(remainingSec / 60);
            const etaSec = remainingSec % 60;
            etaStr = `${String(etaMin).padStart(2, '0')}:${String(etaSec).padStart(2, '0')}`;
            const pct = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
            onProgress(pct, speedStr, etaStr, 'downloading');
          } else {
            onProgress(-1, speedStr, '', 'downloading');
          }

          lastTime = now;
          lastBytes = downloadedBytes;
        }
      });

      const writeStream = fs.createWriteStream(tempPath);
      await pipeline(nodeReadable, writeStream);

      onProgress(99, speedStr, 'Finalizing...', 'finalizing');
      onLog(`[MediaVault Direct] Download complete, moving temp file to: ${targetPath}\n`);

      // Rename temp file to final destination
      await fs.promises.rename(tempPath, targetPath);

      // Verify file exists and is valid
      const stat = await fs.promises.stat(targetPath);
      if (!stat.isFile() || stat.size === 0) {
        throw new Error(`Direct download verification failed. Target file is invalid or empty: ${targetPath}`);
      }

      onProgress(100, '', '', 'completed');
      onLog(`[MediaVault Direct] Verified final file: ${targetPath} (${formatBytes(stat.size)})\n`);

      return targetPath;
    } finally {
      delete (global as Record<string, unknown>)[`__mv_abort_${jobId}`];
    }
  }
}
