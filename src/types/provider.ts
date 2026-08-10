// Provider domain types

export interface ProviderCapabilities {
  supportsAudioOnly: boolean;
  supportsVideoFormats: boolean;
  supportsPause: boolean;
  supportsMetadata: boolean;
}

export interface Provider {
  name: string;
  capabilities: ProviderCapabilities;
  /** Returns true if this provider can handle the given URL */
  canHandle(url: string): boolean;
  /** Fetch metadata and available formats for a URL */
  fetchMetadata(url: string): Promise<import('./download').MediaMetadata>;
  /** Spawn download process, calling onProgress as output arrives */
  download(
    jobId: string,
    url: string,
    formatId: string,
    outputDir: string,
    ffmpegPath: string | undefined,
    onProgress: (
      progress: number,
      speed: string,
      eta: string,
      phase?: import('./download').DownloadPhase
    ) => void,

    onLog: (line: string) => void
  ): Promise<string>; // resolves with output file path
}
