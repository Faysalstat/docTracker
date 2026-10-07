import { Skeleton } from '@/components/ui/skeleton';

export function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row" aria-hidden>
      <Skeleton className="h-9 w-full sm:w-72" />
      <Skeleton className="h-9 w-full sm:w-44" />
      <Skeleton className="h-9 w-full sm:w-44" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <FiltersSkeleton />
      <div className="divide-y rounded-lg border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-5 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
