'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, use, useCallback, useMemo, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';

type ParamValue = string | number | undefined;

interface SetParamsOptions {
  /** Go back to page 1 (default), since filters change the result set. */
  resetPage?: boolean;
  /** `push` adds a history entry (pagination); `replace` does not (typing in search). */
  history?: 'push' | 'replace';
}

interface ListState {
  searchParams: URLSearchParams;
  isPending: boolean;
  /** Bumped by `clearParams` so uncontrolled inputs (search box) can reset. */
  resetKey: number;
  setParams: (updates: Record<string, ParamValue>, options?: SetParamsOptions) => void;
  clearParams: (keys: string[]) => void;
}

const ListStateContext = createContext<ListState | null>(null);

/**
 * The URL is the list's state. Updates run in a transition: the current rows stay
 * visible (dimmed) while the server renders the next result, instead of flashing a skeleton.
 */
export function ListStateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);

  const setParams = useCallback(
    (
      updates: Record<string, ParamValue>,
      { resetPage = true, history = 'replace' }: SetParamsOptions = {},
    ) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      if (resetPage && !('page' in updates)) next.delete('page');

      const query = next.toString();
      const href = (query ? `${pathname}?${query}` : pathname) as Route;
      startTransition(() => {
        if (history === 'push') router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const clearParams = useCallback(
    (keys: string[]) => {
      setParams(Object.fromEntries(keys.map((key) => [key, undefined])));
      setResetKey((key) => key + 1);
    },
    [setParams],
  );

  const value = useMemo(
    () => ({ searchParams, isPending, resetKey, setParams, clearParams }),
    [searchParams, isPending, resetKey, setParams, clearParams],
  );

  return <ListStateContext value={value}>{children}</ListStateContext>;
}

export function useListState() {
  const context = use(ListStateContext);
  if (!context) throw new Error('useListState must be used inside <ListStateProvider>');
  return context;
}

/** Dims its content while a list update is in flight. */
export function ListContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isPending } = useListState();
  return (
    <div
      aria-busy={isPending}
      className={cn('transition-opacity duration-200', isPending && 'opacity-60', className)}
    >
      {children}
    </div>
  );
}
