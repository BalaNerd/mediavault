import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <Skeleton className="h-10 w-3/4 mx-auto rounded-xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
