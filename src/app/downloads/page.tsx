import { listJobs } from '@/lib/queue/download-queue';
import { HistoryList } from '@/components/downloads/history-list';

export const dynamic = 'force-dynamic';

export default async function DownloadsPage() {
  const jobs = listJobs({ limit: 100 });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Downloads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your active download queue and download history.
        </p>
      </div>

      <HistoryList initialJobs={jobs} />
    </div>
  );
}
