export type DuplicateBehavior = 'rename' | 'overwrite' | 'skip';

export interface AppSettings {
  downloadDir: string;
  maxConcurrentDownloads: number;
  ffmpegPath: string;
  ytdlpPath: string;
  galleryDlPath: string;
  spotdlPath: string;
  theme: 'dark' | 'light' | 'system';
  maxHistoryItems: number;
  autoCleanTempFiles: boolean;
  duplicateBehavior: DuplicateBehavior;
  resumeDownloads: boolean;
  autoOpenFolder: boolean;
  processTimeoutSeconds: number;
  maxRetryCount: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  downloadDir: '',        // resolved at runtime to ~/Downloads/MediaVault
  maxConcurrentDownloads: 3,
  ffmpegPath: 'ffmpeg',
  ytdlpPath: 'yt-dlp',
  galleryDlPath: 'gallery-dl',
  spotdlPath: 'spotdl',
  theme: 'dark',
  maxHistoryItems: 500,
  autoCleanTempFiles: true,
  duplicateBehavior: 'rename',
  resumeDownloads: true,
  autoOpenFolder: false,
  processTimeoutSeconds: 900, // 15 minutes
  maxRetryCount: 3,
};

