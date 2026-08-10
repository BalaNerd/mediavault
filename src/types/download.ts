// Download domain types

export type DownloadStatus =
  | 'queued'
  | 'active'
  | 'pausing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export type DownloadPhase =
  | 'queued'
  | 'preparing'
  | 'fetching_metadata'
  | 'downloading'
  | 'downloading_video'
  | 'downloading_audio'
  | 'merging'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export interface DownloadFormat {
  id: string;
  label: string;
  ext: string;
  resolution?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  tbr?: number; // total bitrate kbps
  isAudioOnly: boolean;
  note?: string;
}

export interface MediaMetadata {
  url: string;
  provider: string;
  title: string;
  author?: string;
  thumbnail?: string;
  duration?: number; // seconds
  description?: string;
  formats: DownloadFormat[];
  capabilities?: {
    supportsAudioOnly: boolean;
    supportsVideoFormats: boolean;
    supportsPause: boolean;
    supportsMetadata: boolean;
  };
}

export interface DownloadJob {
  id: string;
  url: string;
  provider: string;
  title: string;
  author?: string;
  thumbnail?: string;
  duration?: number;
  formatId: string;
  formatLabel: string;
  status: DownloadStatus;
  phase: DownloadPhase;
  progress: number; // 0–100
  speed?: string;
  eta?: string;
  error?: string;
  log?: string;
  outputPath?: string;
  fileSize?: number;
  downloadedBytes?: number;
  avgSpeed?: string;
  peakSpeed?: string;
  downloadDuration?: number;
  mergeDuration?: number;
  completedAt?: number;
  retryCount?: number;
  createdAt: number; // unix ms
  updatedAt: number; // unix ms
}

export interface EnqueueDownloadPayload {
  url: string;
  provider?: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration?: number;
  formatId: string;
  formatLabel?: string;
}

export interface QueueItem {
  jobId: string;
  abortController: AbortController;
}

export type JobUpdatePayload = Partial<
  Pick<
    DownloadJob,
    | 'status'
    | 'phase'
    | 'progress'
    | 'speed'
    | 'eta'
    | 'error'
    | 'log'
    | 'outputPath'
    | 'fileSize'
    | 'downloadedBytes'
    | 'avgSpeed'
    | 'peakSpeed'
    | 'downloadDuration'
    | 'mergeDuration'
    | 'completedAt'
    | 'retryCount'
    | 'updatedAt'
  >
>;
