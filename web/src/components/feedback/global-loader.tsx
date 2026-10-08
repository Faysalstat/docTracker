'use client';

import { Loader2Icon } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getActiveRequests,
  getServerActiveRequests,
  installFetchTracker,
  subscribeToRequests,
} from '@/lib/http-loader';

// The overlay blocks input as soon as a request starts, but only becomes visible after
// this delay so quick calls don't flash a full-screen spinner.
const SHOW_DELAY_MS = 150;

/** Full-screen blurred overlay with a spinner while any tracked request is in flight. */
export function GlobalLoader() {
  const active = useSyncExternalStore(
    subscribeToRequests,
    getActiveRequests,
    getServerActiveRequests,
  );
  const [visible, setVisible] = useState(false);
  const busy = active > 0;

  useEffect(() => installFetchTracker(), []);

  // Keyed on busy (not the count) so overlapping requests don't restart the delay.
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    // The overlay stops the mouse; this stops keyboard shortcuts such as Enter re-submitting a form.
    const blockKeys = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', blockKeys, true);
      setVisible(false);
    };
  }, [busy]);

  if (!busy) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${
        visible ? 'bg-background/40 opacity-100 backdrop-blur-sm' : 'opacity-0'
      }`}
    >
      <div className="bg-popover text-popover-foreground flex flex-col items-center gap-3 rounded-xl border px-6 py-5 shadow-lg">
        <Loader2Icon className="text-primary size-8 animate-spin" aria-hidden />
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    </div>
  );
}
