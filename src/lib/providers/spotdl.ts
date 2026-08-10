/**
 * spotdl provider for Spotify tracks, albums, and playlists.
 *
 * SECURITY: All child processes are spawned with array arguments.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { BaseProvider } from './base';
import type { MediaMetadata, DownloadFormat, DownloadPhase } from '@/types/download';
import type { ProviderCapabilities } from '@/types/provider';
import { urlMatchesDomains } from '@/lib/utils/url';
import { providerLogger } from '@/lib/logger';

const SUPPORTED_DOMAINS = ['open.spotify.com', 'spotify.com'];

const SPOTIFY_FORMATS: DownloadFormat[] = [
  {
    id: 'mp3-320',
    label: 'MP3 — 320 kbps (High Quality)',
    ext: 'mp3',
    isAudioOnly: true,
    note: 'Best audio fidelity',
  },
  {
    id: 'mp3-128',
    label: 'MP3 — 128 kbps (Standard)',
    ext: 'mp3',
    isAudioOnly: true,
    note: 'Smaller file size',
  },
  {
    id: 'flac',
    label: 'FLAC (Lossless)',
    ext: 'flac',
    isAudioOnly: true,
    note: 'Lossless audio',
  },
];

export class SpotdlProvider extends BaseProvider {
  readonly name = 'spotdl';

  readonly capabilities: ProviderCapabilities = {
    supportsAudioOnly: true,
    supportsVideoFormats: false,
    supportsPause: false,
    supportsMetadata: true,
  };

  canHandle(url: string): boolean {
    return urlMatchesDomains(url, SUPPORTED_DOMAINS);
  }

  async fetchMetadata(url: string): Promise<MediaMetadata> {
    providerLogger.info({ url }, 'Fetching spotdl metadata');

    let type = 'Track';
    if (url.includes('/album/')) type = 'Album';
    else if (url.includes('/playlist/')) type = 'Playlist';
    else if (url.includes('/artist/')) type = 'Artist';

    const metadata: MediaMetadata = {
      url,
      provider: this.name,
      title: `Spotify ${type}`,
      formats: SPOTIFY_FORMATS,
    };

    try {
      const binary = process.env.SPOTDL_PATH || 'spotdl';
      const info = await new Promise<string>((resolve) => {
        const proc = spawn(binary, ['save', url, '--save-file', '-'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        });
        let out = '';
        proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
        proc.on('close', () => resolve(out));
        proc.on('error', () => resolve(''));
      });

      if (info.trim()) {
        const data = JSON.parse(info);
        const songs = Array.isArray(data) ? data : [data];
        if (songs.length > 0) {
          metadata.title = songs.length === 1
            ? `${songs[0].name} — ${songs[0].artist}`
            : `${songs[0].name || type} (${songs.length} tracks)`;
          metadata.thumbnail = songs[0].cover_url;
          metadata.author = songs[0].artist;
          metadata.duration = songs[0].duration;
        }
      }
    } catch {
      // Fallback gracefully
    }

    return metadata;
  }

  async download(
    jobId: string,
    url: string,
    formatId: string,
    outputDir: string,
    ffmpegPath: string | undefined,
    onProgress: (progress: number, speed: string, eta: string, phase?: DownloadPhase) => void,
    onLog: (line: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const binary = process.env.SPOTDL_PATH || 'spotdl';
      const resolvedDir = path.resolve(outputDir);
      fs.mkdirSync(resolvedDir, { recursive: true });

      let audioFormat = 'mp3';
      let bitrate = '320k';
      if (formatId === 'mp3-128') {
        audioFormat = 'mp3';
        bitrate = '128k';
      } else if (formatId === 'flac') {
        audioFormat = 'flac';
        bitrate = 'flac';
      }

      // Prepare spotdl arguments
      const args = [
        'download',
        url,
        '--output', path.join(resolvedDir, '{title} - {artist}.{output-ext}'),
        '--format', audioFormat,
        ...(audioFormat !== 'flac' ? ['--bitrate', bitrate] : []),
        '--print-errors',
      ];

      if (ffmpegPath) {
        args.push('--ffmpeg', ffmpegPath);
      }

      onProgress(0, '', '', 'preparing');
      onLog(`[MediaVault SpotDL] Command: ${binary} ${args.join(' ')}\n`);

      const proc = spawn(binary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Ensure ffmpeg directory is in PATH if specified
          ...(ffmpegPath ? { PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH || ''}` } : {}),
        },
      });

      (global as Record<string, unknown>)[`__mv_proc_${jobId}`] = proc;

      let stderrBuffer = '';
      let totalTracks = 1;
      let completedTracks = 0;
      const downloadedFiles: string[] = [];

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        onLog(text);

        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Detect playlist counts: [X/Y]
          const playlistMatch = trimmed.match(/\[(\d+)\/(\d+)\]/);
          if (playlistMatch) {
            const current = parseInt(playlistMatch[1], 10);
            const total = parseInt(playlistMatch[2], 10);
            totalTracks = total;
            const pct = Math.min(99, Math.round((current / total) * 100));
            onProgress(pct, `Track ${current} of ${total}`, '', 'downloading_audio');
          }

          // Detect single track completion
          if (trimmed.includes('Downloaded "')) {
            completedTracks++;
            const pct = totalTracks > 1
              ? Math.min(99, Math.round((completedTracks / totalTracks) * 100))
              : 95;
            onProgress(pct, `Downloaded ${completedTracks}/${totalTracks}`, '', 'downloading_audio');

            const fileMatch = trimmed.match(/Downloaded "([^"]+)"/);
            if (fileMatch && fileMatch[1]) {
              const fullCandidate = path.isAbsolute(fileMatch[1])
                ? fileMatch[1]
                : path.join(resolvedDir, fileMatch[1]);
              downloadedFiles.push(fullCandidate);
            }
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
          // Check captured downloaded file paths
          let finalFile = '';
          for (const file of downloadedFiles) {
            try {
              if (fs.existsSync(file)) {
                const stat = fs.statSync(file);
                if (stat.isFile() && stat.size > 0) {
                  finalFile = file;
                  break;
                }
              }
            } catch { /* ignore */ }
          }

          // If single track file exists
          if (finalFile) {
            onProgress(100, '', '', 'completed');
            resolve(finalFile);
            return;
          }

          // For multi-track album or playlist, find most recently created media file
          try {
            const entries = fs.readdirSync(resolvedDir);
            const mediaFiles = entries
              .map((e) => path.join(resolvedDir, e))
              .filter((p) => {
                try {
                  const s = fs.statSync(p);
                  return s.isFile() && s.size > 0 && (p.endsWith('.mp3') || p.endsWith('.flac') || p.endsWith('.ogg'));
                } catch {
                  return false;
                }
              })
              .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

            if (mediaFiles.length > 0) {
              onProgress(100, '', '', 'completed');
              resolve(mediaFiles[0]);
              return;
            }
          } catch { /* ignore */ }

          reject(new Error('SpotDL completed but the downloaded media file could not be verified.'));
        } else {
          const errorMsg = this.sanitizeErrorMessage(stderrBuffer || `spotdl process exited with code ${code}`);
          reject(new Error(errorMsg));
        }
      });

      proc.on('error', (err) => {
        delete (global as Record<string, unknown>)[`__mv_proc_${jobId}`];
        reject(new Error(`Failed to spawn spotdl: ${err.message}. Is spotdl installed?`));
      });
    });
  }
}
