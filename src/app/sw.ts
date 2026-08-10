import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry } from '@serwist/precaching';
import { installSerwist } from '@serwist/sw';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
};

// Filter runtime caching to ensure dynamic API routes are NEVER cached by ServiceWorker
const runtimeCaching = defaultCache.map((entry) => {
  const originalMatcher = entry.matcher;
  return {
    ...entry,
    matcher: (options: { url: URL; request: Request; event: ExtendableEvent; sameOrigin: boolean }) => {
      if (options.url.pathname.startsWith('/api/')) return false;
      if (typeof originalMatcher === 'function') {
        return originalMatcher(options);
      }
      if (originalMatcher instanceof RegExp) {
        return originalMatcher.test(options.url.href);
      }
      if (typeof originalMatcher === 'string') {
        return options.url.href === originalMatcher;
      }
      return true;
    },
  };
});

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});
