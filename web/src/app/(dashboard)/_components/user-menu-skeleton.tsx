import { Skeleton } from '@/components/ui/skeleton';

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-2 p-2" aria-hidden>
      <Skeleton className="size-8 rounded-lg" />
      <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
