import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
// The server has no viewport; render the desktop layout and correct on hydration.
const getServerSnapshot = () => false;

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
