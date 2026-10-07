'use client';

import { Input } from '@/components/ui/input';
import { todayIso } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useListState } from './list-state';

/** Native date inputs: accessible, keyboard-friendly, and use the OS picker on mobile. */
export function DateRangeFilter({ label, className }: { label: string; className?: string }) {
  const { searchParams, setParams, resetKey } = useListState();
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const max = todayIso();

  return (
    <fieldset className={cn('flex items-center gap-2', className)}>
      <legend className="sr-only">{label}</legend>
      <Input
        key={`from-${resetKey}`}
        type="date"
        aria-label={`${label} from`}
        defaultValue={from}
        max={to || max}
        onChange={(event) => setParams({ from: event.target.value || undefined })}
        className="w-full sm:w-38"
      />
      <span className="text-muted-foreground text-sm" aria-hidden>
        to
      </span>
      <Input
        key={`to-${resetKey}`}
        type="date"
        aria-label={`${label} to`}
        defaultValue={to}
        min={from || undefined}
        max={max}
        onChange={(event) => setParams({ to: event.target.value || undefined })}
        className="w-full sm:w-38"
      />
    </fieldset>
  );
}
