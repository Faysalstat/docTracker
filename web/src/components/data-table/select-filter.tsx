'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useListState } from './list-state';

// Radix Select items cannot have an empty value, so "no filter" uses a sentinel.
const ALL = '__all__';

export function SelectFilter({
  param,
  label,
  allLabel,
  options,
  defaultValue,
  className,
}: {
  param: string;
  label: string;
  /** Option that clears the filter. Omit for required params such as sort. */
  allLabel?: string;
  options: { value: string; label: string }[];
  /** Value the API applies when the param is absent (shown instead of the placeholder). */
  defaultValue?: string;
  className?: string;
}) {
  const { searchParams, setParams } = useListState();
  const current = searchParams.get(param) ?? defaultValue ?? (allLabel ? ALL : undefined);
  // Radix only knows an item's label after the options mount in the browser; passing it
  // explicitly puts the selected label in the server HTML (no blank selects before hydration).
  const currentLabel =
    current === ALL ? allLabel : options.find((option) => option.value === current)?.label;

  return (
    <Select
      value={current}
      onValueChange={(value) =>
        setParams({ [param]: value === ALL || value === defaultValue ? undefined : value })
      }
    >
      <SelectTrigger aria-label={label} className={cn('w-full sm:w-44', className)}>
        <SelectValue placeholder={label}>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
