'use client';

import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { cn } from '@/lib/utils';
import { useListState } from './list-state';

const SEARCH_DEBOUNCE_MS = 300;

export function SearchInput({
  placeholder,
  param = 'q',
  className,
}: {
  placeholder: string;
  param?: string;
  className?: string;
}) {
  const { searchParams, setParams, isPending, resetKey } = useListState();
  const onSearch = useDebouncedCallback(
    (value: string) => setParams({ [param]: value.trim() || undefined }),
    SEARCH_DEBOUNCE_MS,
  );

  return (
    <div className={cn('relative', className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        key={resetKey}
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        defaultValue={searchParams.get(param) ?? ''}
        onChange={(event) => onSearch(event.target.value)}
        className="pr-8 pl-8"
      />
      {isPending && (
        <Loader2
          className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin"
          aria-hidden
        />
      )}
    </div>
  );
}
