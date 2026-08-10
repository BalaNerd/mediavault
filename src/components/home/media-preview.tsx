'use client';

import Image from 'next/image';
import { Clock, User, Music, Film, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/utils/format';
import type { MediaMetadata } from '@/types/download';

interface MediaPreviewProps {
  metadata: MediaMetadata;
}

export function MediaPreview({ metadata }: MediaPreviewProps) {
  const getProviderIcon = () => {
    switch (metadata.provider) {
      case 'spotdl':
        return <Music className="w-4 h-4 text-emerald-400" />;
      case 'gallery-dl':
        return <ImageIcon className="w-4 h-4 text-cyan-400" />;
      default:
        return <Film className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-card/60 backdrop-blur-md">
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-5">
        {/* Thumbnail */}
        {metadata.thumbnail ? (
          <div className="relative w-full sm:w-48 h-36 rounded-xl overflow-hidden shrink-0 bg-secondary">
            <Image
              src={metadata.thumbnail}
              alt={metadata.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-full sm:w-48 h-36 rounded-xl shrink-0 bg-secondary flex items-center justify-center text-muted-foreground">
            {getProviderIcon()}
          </div>
        )}

        {/* Metadata Details */}
        <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="flex items-center gap-1.5 py-0.5">
                {getProviderIcon()}
                <span className="capitalize">{metadata.provider}</span>
              </Badge>
              {metadata.duration ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(metadata.duration)}
                </span>
              ) : null}
            </div>

            <h3 className="font-semibold text-lg leading-snug line-clamp-2">
              {metadata.title}
            </h3>

            {metadata.author && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <User className="w-3.5 h-3.5" />
                <span>{metadata.author}</span>
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description || 'Ready for download'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
