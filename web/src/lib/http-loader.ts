// Counts in-flight browser requests so <GlobalLoader> can show a progress bar.
// The Express API is only called server-side (src/data/api-client.ts), so from the
// browser every request the user waits on is a fetch to Next.js: Server Action POSTs
// and RSC navigation payloads. Wrapping window.fetch catches all of them in one place.

/**
 * Requests that never trigger the loader. A string matches when the URL path starts
 * with it; a RegExp is tested against the full URL. Add entries here to opt out.
 */
export const LOADER_IGNORED_URLS: (string | RegExp)[] = [
  '/_next/static',
  '/_next/image',
  '/__nextjs', // dev overlay / source-map lookups
  /\.(?:svg|png|jpe?g|gif|webp|ico|woff2?)(?:\?|$)/,
];

let activeRequests = 0;
const listeners = new Set<() => void>();

function setActive(delta: number) {
  activeRequests = Math.max(0, activeRequests + delta);
  listeners.forEach((listener) => listener());
}

export function subscribeToRequests(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getActiveRequests = () => activeRequests;
export const getServerActiveRequests = () => 0;

function requestUrl(input: RequestInfo | URL): URL | null {
  const raw = input instanceof Request ? input.url : String(input);
  try {
    return new URL(raw, window.location.href);
  } catch {
    return null;
  }
}

function shouldTrack(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  // Link prefetches run in the background on hover/viewport; nobody is waiting on them.
  if (headers.get('Next-Router-Prefetch')) return false;

  const url = requestUrl(input);
  if (!url) return true;
  return !LOADER_IGNORED_URLS.some((pattern) =>
    typeof pattern === 'string' ? url.pathname.startsWith(pattern) : pattern.test(url.href),
  );
}

async function drain(response: Response) {
  const reader = response.clone().body?.getReader();
  if (!reader) return;
  try {
    while (!(await reader.read()).done) {
      // discard chunks; we only care when the stream ends
    }
  } catch {
    // Aborted or network error: the request is over either way.
  }
}

/** Wraps window.fetch once. Returns a cleanup that restores the original. */
export function installFetchTracker() {
  const originalFetch = window.fetch;

  const trackedFetch: typeof fetch = async (input, init) => {
    if (!shouldTrack(input, init)) return originalFetch(input, init);
    setActive(1);
    let response: Response;
    try {
      response = await originalFetch(input, init);
    } catch (error) {
      setActive(-1);
      throw error;
    }
    // With cacheComponents, RSC and Server Action responses send headers immediately
    // and stream the payload afterwards, so fetch() resolving is not "done". Drain a
    // clone to know when the body has fully arrived; Next consumes the original untouched.
    void drain(response).finally(() => setActive(-1));
    return response;
  };

  window.fetch = trackedFetch;
  return () => {
    // Only restore if nothing else has wrapped fetch on top of ours since.
    if (window.fetch === trackedFetch) window.fetch = originalFetch;
  };
}
