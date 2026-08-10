'use client';

import { useState } from 'react';
import { Download, Music, Video, Check, HardDrive, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { DownloadFormat } from '@/types/download';

interface FormatSelectorProps {
  formats: DownloadFormat[];
  onSelectAndDownload: (format: DownloadFormat) => void;
  isSubmitting?: boolean;
}

export function FormatSelector({
  formats,
  onSelectAndDownload,
  isSubmitting = false,
}: FormatSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(
    formats[0]?.id || ''
  );

  const selectedFormat = formats.find((f) => f.id === selectedId) || formats[0];

  const videoFormats = formats.filter((f) => !f.isAudioOnly);
  const audioFormats = formats.filter((f) => f.isAudioOnly);

  return (
    <Card className="border-border/80 bg-card/60 backdrop-blur-md">
      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Select Format &amp; Quality
          </h4>
          <span className="text-xs text-muted-foreground">
            {formats.length} options
          </span>
        </div>

        {/* Format Selection List */}
        <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
          {videoFormats.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-primary" /> Video Formats
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {videoFormats.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className={cn(
                      'flex items-center justify-between p-3.5 rounded-xl border text-left text-sm transition-all touch-target',
                      selectedId === f.id
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                        : 'border-border bg-secondary/30 hover:bg-secondary/60 text-muted-foreground'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground text-xs sm:text-sm truncate">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {f.resolution ? `${f.resolution} ` : ''}
                        {f.fps ? `@ ${f.fps}fps ` : ''}
                        {f.note ? `• ${f.note}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.filesize && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatBytes(f.filesize)}
                        </span>
                      )}
                      {selectedId === f.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {audioFormats.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-emerald-400" /> Audio Only
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {audioFormats.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className={cn(
                      'flex items-center justify-between p-3.5 rounded-xl border text-left text-sm transition-all touch-target',
                      selectedId === f.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500'
                        : 'border-border bg-secondary/30 hover:bg-secondary/60 text-muted-foreground'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground text-xs sm:text-sm truncate">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {f.note || 'Audio extraction'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.filesize && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatBytes(f.filesize)}
                        </span>
                      )}
                      {selectedId === f.id && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-start sm:self-auto">
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              {selectedFormat?.filesize
                ? `Est. size: ${formatBytes(selectedFormat.filesize)}`
                : 'Size calculated dynamically'}
            </span>
          </div>

          <Button
            onClick={() => selectedFormat && onSelectAndDownload(selectedFormat)}
            disabled={!selectedFormat || isSubmitting}
            className="w-full sm:w-auto px-6 h-11 rounded-xl font-medium glow-violet touch-target"
          >
            <Download className="w-4 h-4 mr-2" />
            <span>{isSubmitting ? 'Starting Download...' : 'Start Download'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
