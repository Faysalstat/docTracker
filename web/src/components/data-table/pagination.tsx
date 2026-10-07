'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import type { PaginationMeta } from '@/types/api';
import { useListState } from './list-state';

export function Pagination({ meta, noun }: { meta: PaginationMeta; noun: string }) {
  const { setParams, isPending } = useListState();
  const { page, limit, total, totalPages } = meta;

  if (total === 0) return null;

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  const goTo = (target: number) =>
    setParams({ page: target === 1 ? undefined : target }, { resetPage: false, history: 'push' });

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-muted-foreground text-sm" aria-live="polite">
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)} {noun}
      </p>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-muted-foreground text-sm">Rows</span>
          <Select
            value={String(limit)}
            onValueChange={(value) => setParams({ limit: value, page: undefined })}
          >
            <SelectTrigger size="sm" aria-label="Rows per page" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="First page"
            disabled={page <= 1 || isPending}
            onClick={() => goTo(1)}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page <= 1 || isPending}
            onClick={() => goTo(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-24 text-center text-sm tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= totalPages || isPending}
            onClick={() => goTo(page + 1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Last page"
            disabled={page >= totalPages || isPending}
            onClick={() => goTo(totalPages)}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}
