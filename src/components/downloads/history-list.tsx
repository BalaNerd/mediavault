'use client';

import { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DownloadCard } from './download-card';
import type { DownloadJob } from '@/types/download';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface HistoryListProps {
  initialJobs: DownloadJob[];
}

export function HistoryList({ initialJobs }: HistoryListProps) {
  const [jobs, setJobs] = useState<DownloadJob[]>(initialJobs);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.provider.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' || j.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/download/${id}`, { method: 'DELETE' });
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success('Removed job entry');
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch('/api/download', { method: 'DELETE' });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.status === 'active' || j.status === 'queued'));
        toast.success('Cleared completed history');
      }
    } catch {
      toast.error('Failed to clear history');
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/download/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      if (res.ok) {
        const data = await res.json();
        setJobs((prev) => prev.map((j) => (j.id === id ? data.job : j)));
        toast.success('Re-queued job for download');
      }
    } catch {
      toast.error('Failed to retry download');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search downloads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-secondary/40 border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="rounded-xl text-xs"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            className="rounded-xl text-xs"
          >
            Completed
          </Button>
          <Button
            size="sm"
            variant={filter === 'failed' ? 'default' : 'outline'}
            onClick={() => setFilter('failed')}
            className="rounded-xl text-xs"
          >
            Failed
          </Button>

          {jobs.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClearHistory}
              className="rounded-xl text-xs ml-2"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear History
            </Button>
          )}
        </div>
      </div>

      {filteredJobs.length > 0 ? (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <DownloadCard
              key={job.id}
              initialJob={job}
              onDelete={handleDelete}
              onRetry={handleRetry}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <Download className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h4 className="font-semibold text-sm">No downloads found</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? 'Try clearing your search query' : 'Your download history is empty'}
          </p>
        </div>
      )}
    </div>
  );
}

