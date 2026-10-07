import { Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg',
        className,
      )}
      aria-hidden
    >
      <Stethoscope className="size-4" />
    </span>
  );
}
