'use client';

import { useState } from 'react';
import { Link2, Clipboard, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/useClipboard';
import { isValidUrl } from '@/lib/utils/url';
import { toast } from 'sonner';

interface URLInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

export function URLInput({ onAnalyze, isLoading }: URLInputProps) {
  const [url, setUrl] = useState('');

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
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (isValidUrl(text)) {
          onAnalyze(text.trim());
        }
      }
    } catch {
      toast.error('Could not access clipboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="relative flex items-center group">
        <div className="absolute left-4 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Link2 className="w-5 h-5" />
        </div>

        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL from YouTube, Instagram, Facebook, Spotify, or Direct Media..."
          className="h-14 pl-12 pr-32 text-base rounded-2xl border-border/60 bg-secondary/40 focus:bg-background focus:ring-2 focus:ring-primary/50 transition-all glow-violet"
          disabled={isLoading}
          aria-label="Media URL input"
          style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {!url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePaste}
              className="h-10 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground touch-target"
            >
              <Clipboard className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Paste</span>
            </Button>
          )}

          <Button
            type="submit"
            disabled={!url || isLoading}
            className="h-10 px-4 rounded-xl font-medium glow-violet touch-target"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Analyze</span>
                <span className="sm:hidden">Go</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Official Supported Platform Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Supported Platforms:
        </span>
        <span className="px-2.5 py-1 rounded-full bg-secondary/60 border border-border/50 text-[11px] font-medium text-foreground">YouTube</span>
        <span className="px-2.5 py-1 rounded-full bg-secondary/60 border border-border/50 text-[11px] font-medium text-foreground">Instagram</span>
        <span className="px-2.5 py-1 rounded-full bg-secondary/60 border border-border/50 text-[11px] font-medium text-foreground">Facebook</span>
        <span className="px-2.5 py-1 rounded-full bg-secondary/60 border border-border/50 text-[11px] font-medium text-foreground">Spotify</span>
        <span className="px-2.5 py-1 rounded-full bg-secondary/60 border border-border/50 text-[11px] font-medium text-foreground">Direct Media (.mp3/.mp4)</span>
      </div>
    </form>
  );
}
