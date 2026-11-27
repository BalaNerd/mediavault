'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
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
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-3 left-3 sm:right-4 sm:left-4 md:left-auto md:w-96 z-50 p-4 rounded-2xl glass border border-primary/30 bg-background/95 shadow-2xl glow-violet"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-primary/30 glow-violet shrink-0">
              <Image src="/icon-192.png" alt="MediaVault" width={44} height={44} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Install MediaVault</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install as a native app for fast offline access &amp; instant link sharing.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg touch-target"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} className="h-9 px-3 rounded-xl touch-target text-xs">
            Not now
          </Button>
          <Button size="sm" onClick={handleInstall} className="h-9 px-4 rounded-xl glow-violet touch-target text-xs font-medium">
            Install App
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
