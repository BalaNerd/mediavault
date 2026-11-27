'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  FolderOpen,
  Play,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatRelative } from '@/lib/utils/format';
import { useDownloadProgress } from '@/hooks/useDownloadProgress';
import { toast } from 'sonner';
import type { DownloadJob, DownloadPhase } from '@/types/download';

interface DownloadCardProps {
  initialJob: DownloadJob;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DownloadCard({
  initialJob,
  onCancel,
  onRetry,
  onDelete,
}: DownloadCardProps) {
  const [job, setJob] = useState<DownloadJob>(initialJob);
  const [showLogs, setShowLogs] = useState(false);

  useDownloadProgress(
    job.id,
    (update) => {
      setJob((prev) => ({ ...prev, ...update }));
    },
    job.status
  );

  const handleOpenFile = async () => {
    if (!job.outputPath) return;
    try {
      const res = await fetch('/api/files/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: job.outputPath, filePath: job.outputPath, action: 'open-file' }),
      });
      if (res.ok) toast.success('Opened media file');
      else toast.error('Could not open file');
    } catch {
      toast.error('Failed to trigger file open');
    }
  };

  const handleOpenFolder = async () => {
    if (!job.outputPath) return;
    try {
      const res = await fetch('/api/files/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: job.outputPath, filePath: job.outputPath, action: 'open-folder' }),
      });
      if (res.ok) toast.success('Opened download folder');
      else toast.error('Could not open folder');
    } catch {
      toast.error('Failed to trigger folder open');
    }
  };

  const handleCopyPath = () => {
    if (!job.outputPath) return;
    navigator.clipboard.writeText(job.outputPath);
    toast.success('File path copied to clipboard');
  };

  const getPhaseText = (phase?: DownloadPhase): string => {
    switch (phase) {
      case 'preparing': return 'Preparing';
      case 'fetching_metadata': return 'Fetching Metadata';
      case 'downloading': return 'Downloading';
      case 'downloading_video': return 'Downloading Video';
      case 'downloading_audio': return 'Downloading Audio';
      case 'merging': return 'Merging with FFmpeg';
      case 'finalizing': return 'Finalizing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      case 'retrying': return 'Retrying';
      default: return 'Downloading';
    }
  };

  const getStatusBadge = () => {
    switch (job.status) {
      case 'active':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse font-medium">
            {getPhaseText(job.phase)} ({job.progress}%)
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Completed (100%)
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-rose-500/20 text-rose-400 border-rose-500/30">
            <AlertCircle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-muted-foreground border-border">
            Cancelled
          </Badge>
        );
      case 'queued':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" /> Queued
          </Badge>
        );
      default:
        return <Badge variant="outline">{job.status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-card/60 backdrop-blur-md transition-all">
      <CardContent className="p-3.5 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            {job.thumbnail ? (
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 bg-secondary">
                <Image
                  src={job.thumbnail}
                  alt={job.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-secondary shrink-0 flex items-center justify-center text-muted-foreground font-semibold text-xs sm:text-sm">
                {job.provider.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm leading-snug line-clamp-2 break-words">
                {job.title}
              </h4>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="capitalize font-medium text-foreground/80">{job.provider}</span>
                <span>•</span>
                <span className="truncate max-w-[120px] sm:max-w-none">{job.formatLabel}</span>
                <span>•</span>
                <span>{formatRelative(job.createdAt)}</span>
                {job.retryCount ? (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">Retry #{job.retryCount}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {getStatusBadge()}

            {job.status === 'active' && onCancel && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onCancel(job.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive touch-target"
                aria-label="Cancel download"
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            {(job.status === 'failed' || job.status === 'cancelled') && onRetry && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRetry(job.id)}
                className="h-8 w-8 text-muted-foreground hover:text-primary touch-target"
                aria-label="Retry download"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}

            {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(job.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive touch-target"
                aria-label="Delete entry"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {job.status === 'active' && (
          <div className="space-y-2">
            <Progress value={job.progress < 0 ? 0 : job.progress} className="h-2" />
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-none">
                  {job.speed || getPhaseText(job.phase)}
                </span>
              </span>
              <span className="shrink-0">{job.eta ? `ETA: ${job.eta}` : ''}</span>
            </div>
          </div>
        )}

        {job.error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-rose-300 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Error
            </p>
            <p className="break-words">{job.error}</p>
          </div>
        )}

        {/* Completed Job Actions & Remote File Serving */}
        {job.status === 'completed' && job.outputPath && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-muted-foreground truncate">
                <HardDrive className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="truncate text-[10px] sm:text-xs">{job.outputPath}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                {/* Mobile / Remote Browser Direct File Download */}
                <a
                  href={`/api/files/${job.id}`}
                  download
                  className="inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-8 sm:h-7 px-3 text-xs sm:text-[11px] touch-target"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>Download File</span>
                </a>

                <Button size="xs" variant="secondary" onClick={handleOpenFile} className="h-8 sm:h-7 px-2.5 text-xs sm:text-[11px] touch-target">
                  <Play className="w-3 h-3 mr-1" /> <span>Open</span>
                </Button>
                <Button size="xs" variant="outline" onClick={handleOpenFolder} className="h-8 sm:h-7 px-2.5 text-xs sm:text-[11px] touch-target">
                  <FolderOpen className="w-3 h-3 mr-1" /> <span className="hidden sm:inline">Folder</span>
                </Button>
                <Button size="xs" variant="ghost" onClick={handleCopyPath} className="h-8 sm:h-7 px-2 text-xs sm:text-[11px] touch-target" aria-label="Copy file path">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Statistics */}
            {(job.fileSize || job.avgSpeed || job.downloadDuration) && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground bg-secondary/30 p-2.5 rounded-lg font-mono">
                {job.fileSize && <span>Size: <strong className="text-foreground">{formatBytes(job.fileSize)}</strong></span>}
                {job.avgSpeed && <span>Avg Speed: <strong className="text-foreground">{job.avgSpeed}</strong></span>}
                {job.downloadDuration && <span>Duration: <strong className="text-foreground">{job.downloadDuration.toFixed(1)}s</strong></span>}
              </div>
            )}
          </div>
        )}

        {/* Expandable Execution Logs */}
        {job.log && (
          <div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
            >
              {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showLogs ? 'Hide Detailed Logs' : 'View Execution Logs'}
            </button>

            {showLogs && (
              <pre className="mt-2 p-3 rounded-lg bg-black/50 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48 border border-border/40 whitespace-pre scrollbar-thin">
                {job.log}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
