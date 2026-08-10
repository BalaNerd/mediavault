'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {error.message || 'An unexpected application error occurred.'}
      </p>
      <Button onClick={reset} size="sm" className="rounded-xl">
        <RotateCcw className="w-4 h-4 mr-2" /> Try Again
      </Button>
    </div>
  );
}
