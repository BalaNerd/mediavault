/**
 * Abstract base class that all download providers must extend.
 * Enforces a consistent interface and capability contract.
 */

import type { Provider, ProviderCapabilities } from '@/types/provider';
import type { MediaMetadata, DownloadPhase } from '@/types/download';

export abstract class BaseProvider implements Provider {
  abstract readonly name: string;
  abstract readonly capabilities: ProviderCapabilities;

  abstract canHandle(url: string): boolean;
  abstract fetchMetadata(url: string): Promise<MediaMetadata>;
  abstract download(
    jobId: string,
    url: string,
    formatId: string,
    outputDir: string,
    ffmpegPath: string | undefined,
    onProgress: (progress: number, speed: string, eta: string, phase?: DownloadPhase) => void,
    onLog: (line: string) => void
  ): Promise<string>;

  protected parseProgressLine(line: string): {
    progress?: number;
    speed?: string;
    eta?: string;
    phase?: DownloadPhase;
  } {
    const trimmed = line.trim();

    // Check for merger or ffmpeg post-processing lines
    if (trimmed.includes('[Merger]') || trimmed.includes('[ffmpeg] Merging')) {
      return { phase: 'merging', speed: 'Merging with FFmpeg', eta: '' };
    }
    if (trimmed.includes('[ExtractAudio]')) {
      return { phase: 'finalizing', speed: 'Extracting Audio (FFmpeg)', eta: '' };
    }
    if (trimmed.includes('Deleting original file') || trimmed.includes('Fixing container') || trimmed.includes('[Fixup')) {
      return { phase: 'finalizing', speed: 'Finalizing', eta: '' };
    }

    // [download] Destination: ... signifies start of active download stream
    if (trimmed.startsWith('[download] Destination:')) {
      return { phase: 'downloading_video' };
    }

    // yt-dlp style: [download]  42.3% of ~ 123.45MiB at  1.23MiB/s ETA 00:42
    // or: [download] 100% of 10.00MiB in 00:02
    const match = trimmed.match(
      /\[download\]\s+([\d.]+)%(?:\s+of\s+(?:~\s*)?(\S+))?(?:\s+at\s+([\d.]+\s*\S+\/s|Unknown\s*B\/s))?(?:\s+ETA\s+(\S+))?/i
    );

    if (match && match[1]) {
      const rawPct = parseFloat(match[1]);
      const speed = match[3] && !match[3].toLowerCase().includes('unknown') ? match[3] : '';
      const eta = match[4] && !match[4].toLowerCase().includes('unknown') ? match[4] : '';

      return {
        progress: Math.min(100, Math.max(0, rawPct)),
        speed,
        eta,
        phase: 'downloading_video',
      };
    }

    return {};
  }

  protected sanitizeErrorMessage(stderr: string): string {
    // Filter out known harmless warnings like Python 3.10 deprecation
    const cleanLines = stderr
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.includes('Deprecated Feature: Support for Python version'));

    const text = cleanLines.join('\n').trim();
    if (!text) return 'Download failed with unknown error';

    // Facebook authentication / private errors
    if (
      text.toLowerCase().includes('facebook') &&
      (text.includes('login') || text.includes('log in') || text.includes('checkpoint') || text.includes('private') || text.includes('permission'))
    ) {
      return 'Facebook requires authentication or this content is not publicly accessible.';
    }

    // Instagram authentication / private errors
    if (
      text.toLowerCase().includes('instagram') &&
      (text.includes('login') || text.includes('log in') || text.includes('checkpoint') || text.includes('private') || text.includes('Login required'))
    ) {
      return 'Instagram requires authentication or this post/reel is not publicly accessible.';
    }

    // Authentication and access errors
    if (text.includes('Private video') || text.includes('This video is private')) {
      return 'This video is private and cannot be accessed.';
    }
    if (text.includes('Sign in if you have been granted access') || text.includes('Private content') || text.includes('Authentication required') || text.includes('Sign in to confirm')) {
      return 'This content requires authentication or login credentials.';
    }
    if (text.includes('Age-restricted') || text.includes('confirm your age') || text.includes('age gate')) {
      return 'This video is age-restricted and requires account verification.';
    }
    if (text.includes('Geo-restricted') || text.includes('not available in your country') || text.includes('Your country')) {
      return 'This video is geo-restricted and not available in your region.';
    }

    // Content availability errors
    if (text.includes('Video unavailable') || text.includes('DoesNotExistException') || text.includes('not found') || text.includes('is not a valid URL')) {
      return 'The requested media is unavailable, deleted, or the URL is invalid.';
    }
    if (text.includes('HTTP Error 404') || text.includes('404 Not Found')) {
      return 'Media not found (HTTP 404). Please verify the URL.';
    }
    if (text.includes('HTTP Error 403') || text.includes('403 Forbidden')) {
      return 'Access forbidden (HTTP 403) by provider server.';
    }
    if (text.includes('HTTP Error 429') || text.includes('429 Too Many Requests')) {
      return 'Rate limited by provider. Please wait and try again later.';
    }
    if (text.includes('HTTP Error 503') || text.includes('503 Service Unavailable')) {
      return 'Provider service temporarily unavailable. Please try again later.';
    }

    // Network and connectivity errors
    if (text.includes('Network timeout') || text.includes('Connection timed out') || text.includes('Timeout')) {
      return 'Network timeout. Please check your internet connection and try again.';
    }
    if (text.includes('Connection refused') || text.includes('ECONNREFUSED')) {
      return 'Connection refused. Please check your internet connection.';
    }
    if (text.includes('DNS') || text.includes('ENOTFOUND')) {
      return 'DNS resolution failed. Please check your internet connection.';
    }
    if (text.includes('SSL') || text.includes('TLS') || text.includes('certificate')) {
      return 'SSL/TLS certificate error. Please check your system clock and network.';
    }

    // Binary and dependency errors
    if (text.includes('ffmpeg') && (text.includes('not found') || text.includes('ENOENT') || text.includes('is not recognized'))) {
      return 'FFmpeg binary not found. Please install FFmpeg or set its path in Settings.';
    }
    if (text.includes('yt-dlp') && (text.includes('not found') || text.includes('ENOENT') || text.includes('is not recognized'))) {
      return 'yt-dlp binary not found. Please install yt-dlp or set its path in Settings.';
    }
    if (text.includes('spotdl') && (text.includes('not found') || text.includes('ENOENT') || text.includes('is not recognized'))) {
      return 'spotdl binary not found. Please install spotdl or set its path in Settings.';
    }

    // Disk and filesystem errors
    if (text.includes('No space left') || text.includes('disk full') || text.includes('ENOSPC')) {
      return 'Disk full. Please free up space and try again.';
    }
    if (text.includes('Permission denied') || text.includes('EACCES') || text.includes('Access is denied')) {
      return 'Permission denied. Please check download directory permissions.';
    }

    // Format and compatibility errors
    if (text.includes('Unsupported URL') || text.includes('Unsupported')) {
      return 'This URL format is not supported by the provider.';
    }
    if (text.includes('format not available') || text.includes('no suitable format')) {
      return 'Requested format not available for this media.';
    }

    // Spotify-specific errors
    if (text.includes('Spotify') && (text.includes('not found') || text.includes('unavailable'))) {
      return 'Spotify content unavailable or region-locked.';
    }

    // Grab last line of error output if it's descriptive
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const lastLine = lines.find((l) => l.startsWith('ERROR:')) || lines[lines.length - 1];
    const cleanError = lastLine ? lastLine.replace(/^ERROR:\s*/i, '') : text;

    if (cleanError.length > 200) {
      return cleanError.substring(0, 200) + '...';
    }

    return cleanError;
  }
}
