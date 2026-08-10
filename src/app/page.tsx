'use client';

import { useState } from 'react';
import { URLInput } from '@/components/home/url-input';
import { MediaPreview } from '@/components/home/media-preview';
import { FormatSelector } from '@/components/home/format-selector';
import { DownloadCard } from '@/components/downloads/download-card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { MediaMetadata, DownloadFormat, DownloadJob } from '@/types/download';

export default function HomePage() {
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<DownloadJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setMetadata(null);
    setActiveJob(null);

    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch media metadata');
        return;
      }

      setMetadata(data);
      toast.success('Media metadata loaded successfully');
    } catch {
      toast.error('Network error while analyzing URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: DownloadFormat) => {
    if (!metadata) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: metadata.url,
          formatId: format.id,
          formatLabel: format.label,
          title: metadata.title,
          author: metadata.author,
          thumbnail: metadata.thumbnail,
          duration: metadata.duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to enqueue download');
        return;
      }

      setActiveJob(data.job);
      toast.success('Download started!');
    } catch {
      toast.error('Error starting download');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center space-y-3 py-4 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Download Media <span className="gradient-text">Privately</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Enter a URL from YouTube, Instagram, Facebook, Spotify, or Direct Media to save to your local vault.
        </p>
      </div>

      {/* Main Input */}
      <div className="max-w-2xl mx-auto">
        <URLInput onAnalyze={handleAnalyze} isLoading={isLoading} />
      </div>

      {/* Metadata Preview & Format Selector */}
      {metadata && (
        <div className="space-y-6 max-w-3xl mx-auto animate-slide-up">
          <MediaPreview metadata={metadata} />
          <FormatSelector
            formats={metadata.formats}
            onSelectAndDownload={handleDownload}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Active Enqueued Job Preview */}
      {activeJob && (
        <div className="max-w-3xl mx-auto space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">Active Download Progress</h3>
            <button
              onClick={() => router.push('/downloads')}
              className="text-xs text-primary hover:underline font-medium"
            >
              View Queue →
            </button>
          </div>
          <DownloadCard initialJob={activeJob} />
        </div>
      )}
    </div>
  );
}
