'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shared body for route `error.tsx` boundaries. */
export function ErrorState({
  error,
  retry,
  title = 'Something went wrong',
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center"
    >
      <span className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-6" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">
        We couldn’t load this page. Check your connection and try again.
        {error.digest && <span className="mt-1 block font-mono text-xs">Ref: {error.digest}</span>}
      </p>
      <Button onClick={retry}>
        <RotateCw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
