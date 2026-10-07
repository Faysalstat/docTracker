'use client';

import './globals.css';

// Replaces the root layout when it fails, so it must render its own <html> and <body>.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center font-sans antialiased">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          An unexpected error occurred. Please try again.
          {error.digest && (
            <span className="mt-2 block font-mono text-xs">Ref: {error.digest}</span>
          )}
        </p>
        <button
          type="button"
          onClick={retry}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
