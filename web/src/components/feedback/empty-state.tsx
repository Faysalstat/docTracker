import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
      <span className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-medium">{title}</h2>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}
