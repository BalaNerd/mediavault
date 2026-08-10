/**
 * gallery-dl provider.
 *
 * Supports: Reddit (images), Pixiv, DeviantArt, Flickr, Danbooru,
 *           Imgur, ArtStation, and many more image/gallery sites.
 *
 * SECURITY: All child processes are spawned with array arguments.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { BaseProvider } from './base';
import type { MediaMetadata } from '@/types/download';
import type { ProviderCapabilities } from '@/types/provider';
import { urlMatchesDomains } from '@/lib/utils/url';
import { providerLogger } from '@/lib/logger';

const SUPPORTED_DOMAINS = [
  'reddit.com', 'redd.it',
  'pixiv.net',
  'deviantart.com',
  'flickr.com',
  'danbooru.donmai.us',
  'imgur.com',
  'artstation.com',
  'gelbooru.com',
  'e621.net',
  'furaffinity.net',
  'newgrounds.com',
  'rule34.xxx',
  'sankakucomplex.com',
  'twitter.com', 'x.com',
];

export class GalleryDlProvider extends BaseProvider {
  readonly name = 'gallery-dl';

  readonly capabilities: ProviderCapabilities = {
    supportsAudioOnly: false,
    supportsVideoFormats: false,
    supportsPause: false,
    supportsMetadata: true,
  };

  canHandle(url: string): boolean {
    return urlMatchesDomains(url, SUPPORTED_DOMAINS);
  }

  async fetchMetadata(url: string): Promise<MediaMetadata> {
    providerLogger.info({ url }, 'Fetching gallery-dl metadata');

    const binary = process.env.GALLERY_DL_PATH || 'gallery-dl';

    const metadata: MediaMetadata = {
      url,
      provider: this.name,
      title: 'Image Gallery',
      formats: [
        {
          id: 'default',
          label: 'Download All Images (Original Quality)',
          ext: 'zip',
          isAudioOnly: false,
          note: 'Images saved to folder',
        },
      ],
    };

    try {
      const json = await new Promise<string>((resolve) => {
        const proc = spawn(binary, ['--dump-json', '--no-download', url], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let out = '';
        proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
        proc.on('close', (code) => {
          if (code === 0) resolve(out);
          else resolve('');
        });
        proc.on('error', () => resolve(''));
      });

      if (json.trim()) {
        const lines = json.trim().split('\n');
        const count = lines.length;
        metadata.title = `Gallery (${count} items)`;
        metadata.formats[0].note = `${count} image${count !== 1 ? 's' : ''}`;
      }
    } catch {
      // Fallback
    }

    return metadata;
  }

  async download(
    jobId: string,
    url: string,
    _formatId: string,
    outputDir: string,
    _ffmpegPath: string | undefined,
    onProgress: (progress: number, speed: string, eta: string, phase?: import('@/types/download').DownloadPhase) => void,
    onLog: (line: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const binary = process.env.GALLERY_DL_PATH || 'gallery-dl';
      const galleryDir = path.join(outputDir, 'gallery-dl');

      const args = [
        '--destination', galleryDir,
        '--no-mtime',
        url,
      ];

      providerLogger.info({ jobId, url }, 'Starting gallery-dl download');

      const proc = spawn(binary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      (global as Record<string, unknown>)[`__mv_proc_${jobId}`] = proc;

      let downloadedCount = 0;
      let stderrBuffer = '';
      const downloadedFiles: string[] = [];

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        onLog(text);

        for (const line of text.split('\n')) {
          if (line.includes('#') || line.includes('/') || line.includes('\\')) {
            downloadedCount++;
            onProgress(Math.min(95, downloadedCount * 10), 'Downloading files...', '', 'downloading_video');
          }
          // Try to capture downloaded file paths from gallery-dl output
          const match = line.match(/\[download\]\s+([^\s]+)\s+->\s+(.+)/);
          if (match && match[2]) {
            downloadedFiles.push(match[2].trim());
          }
        }
      });


      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderrBuffer += text;
        onLog(text);
      });

      proc.on('close', (code) => {
        delete (global as Record<string, unknown>)[`__mv_proc_${jobId}`];
        if (code === 0 || code === null) {
          onProgress(100, '', '');
          
          // Try to find actual downloaded files
          if (downloadedFiles.length > 0) {
            // Return the first valid file found
            for (const file of downloadedFiles) {
              if (fs.existsSync(file)) {
                const stat = fs.statSync(file);
                if (stat.isFile() && stat.size > 0) {
                  providerLogger.info({ jobId, file }, 'Gallery download completed with file');
                  resolve(file);
                  return;
                }
              }
            }
          }
          
          // Fallback: scan the gallery directory for downloaded files
          try {
            if (fs.existsSync(galleryDir)) {
              const files = fs.readdirSync(galleryDir);
              let newestFile = '';
              let newestTime = 0;
              
              for (const file of files) {
                const filePath = path.join(galleryDir, file);
                try {
                  const stat = fs.statSync(filePath);
                  if (stat.isFile() && stat.size > 0 && stat.mtimeMs > newestTime) {
                    newestTime = stat.mtimeMs;
                    newestFile = filePath;
                  }
                } catch { /* ignore */ }
              }
              
              if (newestFile) {
                providerLogger.info({ jobId, finalPath: newestFile }, 'Gallery download completed with detected file');
                resolve(newestFile);
                return;
              }
            }
          } catch (scanErr) {
            providerLogger.warn({ jobId, err: scanErr }, 'Gallery directory scan failed');
          }
          
          // If no files found but directory exists, return directory
          if (fs.existsSync(galleryDir)) {
            providerLogger.info({ jobId, galleryDir }, 'Gallery download completed with directory');
            resolve(galleryDir);
          } else {
            reject(new Error('Gallery download completed but no files or directory found'));
          }
        } else {
          const errorMsg = this.sanitizeErrorMessage(stderrBuffer || `gallery-dl exited with code ${code}`);
          reject(new Error(errorMsg));
        }
      });

      proc.on('error', (err) => {
        delete (global as Record<string, unknown>)[`__mv_proc_${jobId}`];
        reject(new Error(`Failed to start gallery-dl: ${err.message}. Is gallery-dl installed?`));
      });
    });
  }
}

