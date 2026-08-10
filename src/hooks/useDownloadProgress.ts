'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { DownloadJob, JobUpdatePayload } from '@/types/download';

type ProgressCallback = (update: Partial<DownloadJob>) => void;

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function useDownloadProgress(
  jobId: string | null,
  onUpdate: ProgressCallback,
  initialStatus?: string
) {
  const esRef = useRef<EventSource | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const pendingUpdateRef = useRef<JobUpdatePayload | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTerminalRef = useRef<boolean>(
    initialStatus ? TERMINAL_STATUSES.has(initialStatus) : false
  );

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Flush pending updates
  const flushUpdate = useCallback(() => {
    if (pendingUpdateRef.current) {
      onUpdateRef.current(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
    debounceTimerRef.current = null;
  }, []);

  const scheduleUpdate = useCallback((data: JobUpdatePayload) => {
    if (data.status && TERMINAL_STATUSES.has(data.status)) {
      isTerminalRef.current = true;
    }

    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...data };

    // Update immediately for status changes or completion
    if (data.status && TERMINAL_STATUSES.has(data.status)) {
      flushUpdate();
      return;
    }

    // Debounce high-frequency progress updates to 100ms
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(flushUpdate, 100);
  }, [flushUpdate]);

  // Fallback Polling Loop
  const startPolling = useCallback(() => {
    if (!jobId || isTerminalRef.current) return;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    const poll = async () => {
      if (isTerminalRef.current) return;

      try {
        const res = await fetch(`/api/download/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.job) {
            scheduleUpdate(data.job);
            if (TERMINAL_STATUSES.has(data.job.status)) {
              isTerminalRef.current = true;
              return;
            }
          }
        }
      } catch {
        /* ignore network glitches */
      }

      if (!isTerminalRef.current) {
        pollTimerRef.current = setTimeout(poll, 1500);
      }
    };

    pollTimerRef.current = setTimeout(poll, 1000);
  }, [jobId, scheduleUpdate]);

  useEffect(() => {
    if (!jobId) return;
    if (initialStatus && TERMINAL_STATUSES.has(initialStatus)) return;

    isTerminalRef.current = false;
    let sseRetryTimeout: NodeJS.Timeout | null = null;
    let retryAttempts = 0;

    function connectSSE() {
      if (isTerminalRef.current) return;

      try {
        const es = new EventSource(`/api/download/${jobId}/progress`);
        esRef.current = es;

        es.onmessage = (event) => {
          try {
            const data: JobUpdatePayload = JSON.parse(event.data);
            retryAttempts = 0; // Reset counter on valid message
            scheduleUpdate(data);

            if (data.status && TERMINAL_STATUSES.has(data.status)) {
              isTerminalRef.current = true;
              es.close();
              esRef.current = null;
              if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
            }
          } catch {
            /* ignore JSON parse errors */
          }
        };

        es.onerror = () => {
          es.close();
          esRef.current = null;
          retryAttempts++;

          // Immediately start fallback polling
          startPolling();

          // Attempt SSE reconnection up to 3 times with exponential backoff
          if (retryAttempts <= 3 && !isTerminalRef.current) {
            const delay = Math.min(1000 * Math.pow(2, retryAttempts), 8000);
            sseRetryTimeout = setTimeout(connectSSE, delay);
          }
        };
      } catch {
        startPolling();
      }
    }

    connectSSE();

    return () => {
      if (sseRetryTimeout) clearTimeout(sseRetryTimeout);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [jobId, initialStatus, scheduleUpdate, startPolling]);
}
