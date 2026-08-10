'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Monitors clipboard for URL changes.
 * Calls onUrl when a new valid URL is detected in the clipboard.
 */
export function useClipboard(onUrl: (url: string) => void, enabled = true) {
  const lastUrl = useRef<string>('');
  const onUrlRef = useRef(onUrl);

  useEffect(() => {
    onUrlRef.current = onUrl;
  }, [onUrl]);

  const check = useCallback(async () => {
    if (!navigator?.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (
        trimmed !== lastUrl.current &&
        (trimmed.startsWith('http://') || trimmed.startsWith('https://'))
      ) {
        lastUrl.current = trimmed;
        onUrlRef.current(trimmed);
      }
    } catch {
      // Permission denied or not available
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, check]);
}
