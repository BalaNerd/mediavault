'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 p-4 rounded-2xl glass border border-primary/20 bg-background/90 shadow-2xl glow-violet"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Install MediaVault</h4>
              <p className="text-xs text-muted-foreground">
                Install as a native app for fast offline access & background downloads.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Not now
          </Button>
          <Button size="sm" onClick={handleInstall} className="glow-violet">
            Install App
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
