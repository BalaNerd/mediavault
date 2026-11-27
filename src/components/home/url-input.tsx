'use client';

import { useState, useEffect } from 'react';
import { Link2, Clipboard, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/useClipboard';
import { isValidUrl } from '@/lib/utils/url';
import { toast } from 'sonner';

interface URLInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  initialUrl?: string;
}

export function URLInput({ onAnalyze, isLoading, initialUrl = '' }: URLInputProps) {
  const [url, setUrl] = useState(initialUrl);

  // Sync when initialUrl updates (e.g. from PWA share_target query params)
  useEffect(() => {
    if (initialUrl && initialUrl !== url) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  // Auto-fill from clipboard on window focus if enabled
  useClipboard((clipboardUrl) => {
    if (!url && isValidUrl(clipboardUrl)) {
      setUrl(clipboardUrl);
      toast.info('Pasted URL from clipboard');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!isValidUrl(url)) {
      toast.error('Please enter a valid HTTP/HTTPS URL');
      return;
    }
    onAnalyze(url.trim());
  };

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.error('Clipboard access not supported by browser');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        setUrl(trimmed);
        if (isValidUrl(trimmed)) {
          toast.success('Pasted from clipboard');
          onAnalyze(trimmed);
        } else {
          toast.info('Pasted text from clipboard');
        }
      } else {
        toast.info('Clipboard is empty');
      }
    } catch {
      toast.error('Could not access clipboard. Please paste manually.');
    }
  };

  const handleClear = () => {
    setUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Input container: Responsive for mobile viewports (360px+) */}
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 group">
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3.5 sm:left-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
            <Link2 className="w-5 h-5" />
          </div>

          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube, Instagram, Spotify, or direct media link..."
            className="h-12 sm:h-14 pl-11 pr-10 sm:pr-36 text-sm sm:text-base rounded-2xl border-border/70 bg-secondary/40 focus:bg-background focus:ring-2 focus:ring-primary/50 transition-all glow-violet w-full"
            disabled={isLoading}
            aria-label="Media URL input"
          />

          {/* Clear button inside input */}
          {url && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground sm:right-[9.5rem] transition-colors"
              aria-label="Clear URL"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Desktop inline action buttons (hidden on mobile, visible on sm+) */}
          <div className="hidden sm:flex absolute right-2 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePaste}
              className="h-10 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground touch-target"
            >
              <Clipboard className="w-3.5 h-3.5 mr-1" />
              <span>Paste</span>
            </Button>

            <Button
              type="submit"
              disabled={!url.trim() || isLoading}
              className="h-10 px-4 rounded-xl font-medium glow-violet touch-target"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Analyze</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile touch-friendly action button row (< sm screens, min-h-[44px]) */}
        <div className="flex sm:hidden items-center gap-2 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePaste}
            disabled={isLoading}
            className="flex-1 min-h-[44px] h-11 rounded-xl text-xs font-medium border border-border/60 active:scale-[0.98] transition-transform"
          >
            <Clipboard className="w-4 h-4 mr-1.5 text-primary" />
            <span>Paste URL</span>
          </Button>

          <Button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="flex-1 min-h-[44px] h-11 rounded-xl text-xs font-medium glow-violet active:scale-[0.98] transition-transform"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <>
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Official Supported Platform Badges */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1 font-medium text-foreground/80">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Supported:
        </span>
        <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border/50 text-[10px] sm:text-[11px] font-medium text-foreground">YouTube</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border/50 text-[10px] sm:text-[11px] font-medium text-foreground">Instagram</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border/50 text-[10px] sm:text-[11px] font-medium text-foreground">Facebook</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border/50 text-[10px] sm:text-[11px] font-medium text-foreground">Spotify</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border/50 text-[10px] sm:text-[11px] font-medium text-foreground">Direct Media</span>
      </div>
    </form>
  );
}
