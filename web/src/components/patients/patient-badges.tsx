import { Badge } from '@/components/ui/badge';
import {
  type Condition,
  CONDITION_LABELS,
  type PatientStatus,
  STATUS_LABELS,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<PatientStatus, string> = {
  admitted: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  under_treatment: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  recovered: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

export function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <Badge variant="secondary" className={cn('border-transparent', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  return <Badge variant="outline">{CONDITION_LABELS[condition]}</Badge>;
}
