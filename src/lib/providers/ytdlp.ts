/**
 * yt-dlp provider for YouTube, Instagram, and Facebook.
 *
 * OFFICIAL SUPPORT:
 * 1. YouTube (videos, Shorts, audio extraction)
 * 2. Instagram (Reels, Videos, Video posts)
 * 3. Facebook (Videos, Watch, Reels, fb.watch)
 *
 * SECURITY: All child processes are spawned with array arguments.
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { BaseProvider } from './base';
import type { MediaMetadata, DownloadFormat, DownloadPhase } from '@/types/download';
import type { ProviderCapabilities } from '@/types/provider';
import { urlMatchesDomains } from '@/lib/utils/url';
import { providerLogger } from '@/lib/logger';
import { verifyFileExists, findMatchingFileInDir } from '@/lib/utils/filename';

const SUPPORTED_DOMAINS = [
  'youtube.com', 'youtu.be',
  'instagram.com', 'instagr.am',
  'facebook.com', 'fb.watch', 'fb.com', 'm.facebook.com', 'web.facebook.com', 'watch.facebook.com'
];

function resolveFfmpegLocation(configuredPath?: string): string | undefined {
  if (configuredPath && configuredPath !== 'ffmpeg') {
    try {
      let resolved = configuredPath.trim();
      if (resolved.startsWith('~/') || resolved.startsWith('~\\')) {
        resolved = path.join(os.homedir(), resolved.slice(2));
      } else {
        resolved = path.resolve(resolved);
      }
      if (fs.existsSync(resolved)) {
        return fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
      }
    } catch { /* ignore */ }
  }

  // Auto-detect from system PATH
  try {
    if (process.platform === 'win32') {
      const out = execSync('where.exe ffmpeg', { stdio: ['ignore', 'pipe', 'pipe'] })
        .toString()
        .split('\r\n')[0]
        .trim();
      if (out && fs.existsSync(out)) return path.dirname(out);
    } else {
      const out = execSync('which ffmpeg', { stdio: ['ignore', 'pipe', 'pipe'] })
        .toString()
        .trim();
      if (out && fs.existsSync(out)) return path.dirname(out);
    }
  } catch { /* ignore */ }

  return undefined;
}

function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const binary = process.env.YTDLP_PATH || 'yt-dlp';
      const proc = spawn(binary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        // If exit code is 0, resolve stdout even if stderr had deprecation warnings
        if (code === 0) {
          resolve(stdout);
        } else {
          const errorMsg = stderr || `yt-dlp exited with code ${code}`;
          reject(new Error(errorMsg));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to start yt-dlp: ${err.message}. Is yt-dlp installed and on PATH?`));
      });
    } catch (err) {
      reject(new Error(`Failed to spawn yt-dlp: ${(err as Error).message}. Is yt-dlp installed and on PATH?`));
    }
  });
}

export class YtDlpProvider extends BaseProvider {
  readonly name = 'yt-dlp';

  readonly capabilities: ProviderCapabilities = {
    supportsAudioOnly: true,
    supportsVideoFormats: true,
    supportsPause: false,
    supportsMetadata: true,
  };

  canHandle(url: string): boolean {
    return urlMatchesDomains(url, SUPPORTED_DOMAINS);
  }

  async fetchMetadata(url: string): Promise<MediaMetadata> {
    providerLogger.info({ url }, 'Fetching yt-dlp metadata');

    let json = '';
    try {
      json = await runYtDlp([
        '--dump-single-json',
        '--no-playlist',
        '--no-warnings',
        '--encoding', 'utf-8',
        ...(process.platform === 'win32' ? ['--windows-filenames'] : []),
        url,
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(this.sanitizeErrorMessage(msg));
    }

    let info: Record<string, unknown>;
    try {
      info = JSON.parse(json);
    } catch {
      throw new Error('Failed to parse metadata returned by yt-dlp');
    }

    const rawFormats: DownloadFormat[] = [];
    const formatsList = Array.isArray(info.formats) ? (info.formats as Record<string, unknown>[]) : [];

    // 1. Progressive Formats (Single stream containing both video + audio)
    const progressiveFormats = formatsList.filter(
      (f) => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none' && f.ext !== 'mhtml'
    );

    // 2. DASH Streams (Separate video and audio streams)
    const hasVideoDASH = formatsList.some(
      (f) => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none')
    );
    const hasAudioDASH = formatsList.some(
      (f) => (!f.vcodec || f.vcodec === 'none') && f.acodec && f.acodec !== 'none'
    );

    // Add progressive options first
    if (progressiveFormats.length > 0) {
      const sortedProgressive = [...progressiveFormats].sort(
        (a, b) =>
          ((b.height as number) || 0) - ((a.height as number) || 0) ||
          ((b.tbr as number) || 0) - ((a.tbr as number) || 0)
      );

      const seenResolutions = new Set<string>();
      for (const f of sortedProgressive) {
        const height = (f.height as number) || 0;
        const res = height ? `${height}p` : (f.resolution as string) || 'Standard';
        if (seenResolutions.has(res)) continue;
        seenResolutions.add(res);

        rawFormats.push({
          id: String(f.format_id),
          label: `${res} (${String(f.ext || 'mp4').toUpperCase()}) — Progressive`,
          ext: String(f.ext || 'mp4'),
          resolution: res,
          fps: typeof f.fps === 'number' ? f.fps : undefined,
          vcodec: typeof f.vcodec === 'string' ? f.vcodec : undefined,
          acodec: typeof f.acodec === 'string' ? f.acodec : undefined,
          filesize: typeof f.filesize === 'number' ? f.filesize : typeof f.filesize_approx === 'number' ? f.filesize_approx : undefined,
          tbr: typeof f.tbr === 'number' ? f.tbr : undefined,
          isAudioOnly: false,
          note: 'Direct single stream (no merge needed)',
        });
      }
    }

    // Add Best Quality (Merged video + audio) if DASH streams exist
    if (hasVideoDASH && hasAudioDASH) {
      rawFormats.push({
        id: 'bestvideo+bestaudio/best',
        label: 'Best Quality Video (Merged MP4)',
        ext: 'mp4',
        isAudioOnly: false,
        note: 'High definition video + audio (FFmpeg merge)',
      });

      // Also offer 1080p merged if available
      const has1080p = formatsList.some((f) => ((f.height as number) || 0) >= 1080);
      if (has1080p) {
        rawFormats.push({
          id: 'bestvideo[height<=1080]+bestaudio/best',
          label: '1080p Full HD (Merged MP4)',
          ext: 'mp4',
          resolution: '1080p',
          isAudioOnly: false,
          note: '1080p max resolution (FFmpeg merge)',
        });
      }
    }

    // Audio-Only MP3 Option
    const audioStreams = formatsList.filter(
      (f) => (!f.vcodec || f.vcodec === 'none') && f.acodec && f.acodec !== 'none'
    );
    const bestAudio = audioStreams.sort(
      (a, b) => ((b.abr as number) || 0) - ((a.abr as number) || 0)
    )[0];

    rawFormats.push({
      id: 'bestaudio/best',
      label: 'Audio Only (MP3)',
      ext: 'mp3',
      isAudioOnly: true,
      filesize: bestAudio && (bestAudio.filesize || bestAudio.filesize_approx)
        ? ((bestAudio.filesize || bestAudio.filesize_approx) as number)
        : undefined,
      note: bestAudio?.abr ? `~${Math.round(bestAudio.abr as number)} kbps MP3 extraction` : 'High quality MP3 audio',
    });

    // If no progressive formats exist, ensure Best Quality is at the top
    if (progressiveFormats.length === 0 && rawFormats.length > 0 && !rawFormats[0].id.includes('bestvideo')) {
      const bestMergedIdx = rawFormats.findIndex((f) => f.id === 'bestvideo+bestaudio/best');
      if (bestMergedIdx > -1) {
        const [bestMerged] = rawFormats.splice(bestMergedIdx, 1);
        rawFormats.unshift(bestMerged);
      }
    }

    return {
      url,
      provider: this.name,
      title: (info.title as string) || 'Media Download',
      author: (info.uploader as string) || (info.channel as string) || (info.creator as string) || undefined,
      thumbnail: (info.thumbnail as string) || undefined,
      duration: typeof info.duration === 'number' ? info.duration : undefined,
      description: typeof info.description === 'string' ? info.description : undefined,
      formats: rawFormats,
    };
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
      const binary = process.env.YTDLP_PATH || 'yt-dlp';
      const resolvedDir = path.resolve(outputDir);

      // Ensure output directory exists before spawning
      fs.mkdirSync(resolvedDir, { recursive: true });

      // Output template using path.join to guarantee valid path separator
      const outputTemplate = path.join(resolvedDir, '%(title)s.%(ext)s');

      const isAudioExtraction = formatId === 'bestaudio/best' || formatId.startsWith('bestaudio');
      const isProgressive = !formatId.includes('+') && !isAudioExtraction;

      const ffmpegLocation = resolveFfmpegLocation(ffmpegPath);

      // Gracefully handle stream merging when FFmpeg is missing
      let effectiveFormatId = formatId;
      if (!ffmpegLocation) {
        if (isAudioExtraction) {
          onLog('[MediaVault yt-dlp] Note: FFmpeg not detected in PATH or configuration. Extraction may rely on internal decoders.\n');
        } else if (!isProgressive) {
          onLog('[MediaVault yt-dlp] Notice: FFmpeg not found for stream merging. Falling back to best progressive format to ensure successful download.\n');
          effectiveFormatId = 'best[ext=mp4]/best';
        }
      }

      const args = [
        '--format', effectiveFormatId,
        '--output', outputTemplate,
        '--no-playlist',
        '--progress',
        '--newline',
        '--no-warnings',
        '--encoding', 'utf-8',
        ...(process.platform === 'win32' ? ['--windows-filenames'] : []),
        '--trim-filenames', '200',
        '--print', 'after_move:filepath',
        '--print', 'filename',
        '--print', 'filepath',
      ];

      if (ffmpegLocation) {
        args.push('--ffmpeg-location', ffmpegLocation);
      }

      if (isAudioExtraction) {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      } else if (!isProgressive && ffmpegLocation) {
        args.push('--merge-output-format', 'mp4');
      }

      args.push(url);

      providerLogger.info({ jobId, formatId: effectiveFormatId, url, resolvedDir, outputTemplate, ffmpegLocation }, 'Starting yt-dlp download');
      onLog(`[MediaVault yt-dlp] Spawning: ${binary} ${args.join(' ')}\n`);

      const downloadStartTime = Date.now();
      let proc: ChildProcess;
      try {
        proc = spawn(binary, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PYTHONUTF8: '1',
            PYTHONIOENCODING: 'utf-8',
            ...(ffmpegLocation ? { PATH: `${ffmpegLocation}${path.delimiter}${process.env.PATH || ''}` } : {}),
          },
        });
      } catch (spawnErr) {
        delete (global as Record<string, unknown>)[`__mv_proc_${jobId}`];
        const msg = `Failed to spawn yt-dlp process: ${(spawnErr as Error).message}. Ensure yt-dlp is installed.`;
        providerLogger.error({ jobId, err: spawnErr }, msg);
        reject(new Error(msg));
        return;
      }

      (global as Record<string, unknown>)[`__mv_proc_${jobId}`] = proc;

      let stderrBuffer = '';
      let maxProgressSeen = 0;
      let streamPass = 0; // 0: first stream (video or single stream), 1: second stream (audio)
      const rawPrintedPaths: string[] = [];

      // Initial state transition
      onProgress(0, '', '', 'preparing');

      proc.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        onLog(text);

        for (const line of text.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Track stream passes when downloading split streams
          if (trimmed.startsWith('[download] Destination:') && maxProgressSeen >= 70) {
            streamPass++;
          }

          const parsed = this.parseProgressLine(trimmed);

          if (parsed.progress !== undefined) {
            let overallPct = parsed.progress;
            let currentPhase: DownloadPhase = 'downloading_video';

            if (isProgressive) {
              // Direct single progressive stream: 0% - 99%
              overallPct = Math.min(99, Math.round(parsed.progress));
              currentPhase = 'downloading_video';
            } else if (isAudioExtraction) {
              // Audio download: 0% - 88%
              overallPct = Math.min(88, Math.round(parsed.progress * 0.88));
              currentPhase = 'downloading_audio';
            } else {
              // Split video + audio:
              if (streamPass === 0) {
                // Video stream: 0% - 75%
                overallPct = Math.min(75, Math.round(parsed.progress * 0.75));
                currentPhase = 'downloading_video';
              } else {
                // Audio stream: 75% - 92%
                overallPct = Math.min(92, Math.round(75 + (parsed.progress * 0.17)));
                currentPhase = 'downloading_audio';
              }
            }

            // Monotonic progress guarantee
            if (overallPct > maxProgressSeen) {
              maxProgressSeen = overallPct;
            }

            onProgress(maxProgressSeen, parsed.speed || '', parsed.eta || '', currentPhase);
          } else if (parsed.phase) {
            if (parsed.phase === 'merging') {
              maxProgressSeen = Math.max(maxProgressSeen, 93);
              onProgress(maxProgressSeen, 'Merging with FFmpeg', '', 'merging');
            } else if (parsed.phase === 'finalizing') {
              maxProgressSeen = Math.max(maxProgressSeen, 97);
              onProgress(maxProgressSeen, parsed.speed || 'Finalizing', '', 'finalizing');
            }
          }

          // Capture output paths printed by --print arguments
          if (!trimmed.startsWith('[') && (trimmed.includes(path.sep) || trimmed.includes('/'))) {
            rawPrintedPaths.push(trimmed);
          }
        }
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderrBuffer += text;
        onLog(text);
      });

      proc.on('close', (code) => {
        delete (global as Record<string, unknown>)[`__mv_proc_${jobId}`];

        // Deduplicate and normalize all printed paths
        const normalizedCandidates = Array.from(
          new Set(
            rawPrintedPaths
              .map((p) => p.trim().replace(/^["']|["']$/g, ''))
              .filter(Boolean)
              .map((p) => path.resolve(p))
          )
        );

        providerLogger.info(
          { jobId, exitCode: code, printedCount: normalizedCandidates.length, normalizedCandidates },
          'yt-dlp process closed'
        );

        if (code === 0 || code === null) {
          // Find authoritative existing file (prioritize the last printed after_move:filepath)
          let finalPath = '';
          for (let i = normalizedCandidates.length - 1; i >= 0; i--) {
            const candidate = normalizedCandidates[i];
            const verified = verifyFileExists(candidate) || findMatchingFileInDir(resolvedDir, candidate, downloadStartTime);
            if (verified) {
              finalPath = verified;
              break;
            }
          }

          // If still not found, check resolvedDir for any media file created during this download
          if (!finalPath) {
            finalPath = findMatchingFileInDir(resolvedDir, outputTemplate, downloadStartTime) || '';
          }

          if (finalPath) {
            const stat = fs.statSync(finalPath);
            onLog(`[MediaVault yt-dlp] Verified final media file: ${finalPath} (${stat.size} bytes)\n`);

            // Safe job-scoped intermediate file cleanup
            try {
              const fileDir = path.dirname(finalPath);
              const fileBase = path.basename(finalPath, path.extname(finalPath));
              const tempExtensions = ['.part', '.ytdl', '.temp', '.tmp'];

              const dirEntries = fs.readdirSync(fileDir);
              for (const entry of dirEntries) {
                if (entry.startsWith(fileBase) && tempExtensions.some((ext) => entry.endsWith(ext))) {
                  const tempFilePath = path.join(fileDir, entry);
                  try {
                    fs.unlinkSync(tempFilePath);
                    onLog(`[MediaVault yt-dlp] Cleaned temporary artifact: ${entry}\n`);
                  } catch { /* ignore */ }
                }
              }
            } catch { /* ignore cleanup error */ }

            resolve(finalPath);
          } else {
            const errDetails = `Download process finished with exit code 0, but the output file could not be verified on disk.\n` +
              `Resolved Directory: ${resolvedDir}\n` +
              `Printed Paths: [${normalizedCandidates.join(', ')}]\n` +
              `Working Directory: ${process.cwd()}`;
            providerLogger.error({ jobId, errDetails }, 'Output verification failed');
            reject(new Error(errDetails));
          }
        } else {
          const errorMsg = this.sanitizeErrorMessage(stderrBuffer || `yt-dlp process failed with exit code ${code}`);
          providerLogger.error({ jobId, exitCode: code, errorMsg }, 'yt-dlp execution error');
          reject(new Error(errorMsg));
        }
      });

      proc.on('error', (err) => {
        delete (global as Record<string, unknown>)[`__mv_proc_${jobId}`];
        providerLogger.error({ jobId, err }, 'yt-dlp child process emitted error');
        reject(new Error(`Failed to execute yt-dlp: ${err.message}. Ensure yt-dlp is installed and executable.`));
      });
    });
  }
}
