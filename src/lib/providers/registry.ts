/**
 * Provider registry — Deterministic URL → Provider routing.
 *
 * Officially Supported Platforms:
 * 1. Spotify -> SpotdlProvider
 * 2. Direct Media (.mp3, .mp4, .m4a, etc.) -> DirectMediaProvider
 * 3. YouTube / Instagram / Facebook -> YtDlpProvider
 *
 * Any other URL is treated as unsupported.
 */

import { YtDlpProvider } from './ytdlp';
import { SpotdlProvider } from './spotdl';
import { DirectMediaProvider } from './direct';
import type { Provider } from '@/types/provider';
import { isValidUrl } from '@/lib/utils/url';

// Instantiate singletons in priority order
const providers: Provider[] = [
  new SpotdlProvider(),       // 1. Spotify
  new DirectMediaProvider(),  // 2. Direct Media (.mp3, .mp4, etc.)
  new YtDlpProvider(),        // 3. YouTube, Instagram, Facebook
];

/**
 * Find the appropriate provider for a given URL using deterministic routing.
 * Returns null if no supported provider matches.
 */
export function getProvider(url: string): Provider | null {
  if (!isValidUrl(url)) return null;
  return providers.find((p) => p.canHandle(url)) ?? null;
}

/**
 * Returns all registered official providers.
 */
export function getAllProviders(): Provider[] {
  return providers;
}

/**
 * Get a provider by name.
 */
export function getProviderByName(name: string): Provider | null {
  return providers.find((p) => p.name === name) ?? null;
}
