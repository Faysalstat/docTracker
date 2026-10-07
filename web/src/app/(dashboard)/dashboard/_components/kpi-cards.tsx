import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSummary } from '@/data/stats';
import type { ResolvedRange } from '@/lib/date-range';
import { formatNumber } from '@/lib/format';

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: React.ReactNode;
}) {
  return (
    <Card className="gap-1 py-5">
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
        {detail && <div className="text-muted-foreground text-xs">{detail}</div>}
      </CardContent>
    </Card>
  );
}

/**
 * Period-over-period change. Neutral ink, because more admissions is neither good nor
 * bad; the arrow icon and the signed text carry the direction (never color alone).
 */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span>No admissions in the previous period</span>;
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3.5" aria-hidden />
      <span className="text-foreground font-medium">
        {rounded > 0 ? '+' : ''}
        {rounded}%
      </span>
      vs previous period ({formatNumber(previous)})
    </span>
  );
}

export async function KpiCards({ range }: { range: ResolvedRange }) {
  const summary = await getSummary(range);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatTile
        label="Total doctors"
        value={formatNumber(summary.totalDoctors)}
        detail={`${formatNumber(summary.avgPatientsPerDoctor)} patients per doctor on average`}
      />
      <StatTile
        label="Total patients"
        value={formatNumber(summary.totalPatients)}
        detail="All time"
      />
      <StatTile
        label={`Admissions · ${range.label.toLowerCase()}`}
        value={formatNumber(summary.admissions)}
        detail={
          summary.previousAdmissions === null ? (
            range.from ? (
              'Not enough history to compare'
            ) : (
              'Across all recorded admissions'
            )
          ) : (
            <Delta current={summary.admissions} previous={summary.previousAdmissions} />
          )
        }
      />
      <StatTile
        label="Currently in care"
        value={formatNumber(summary.currentlyAdmitted)}
        detail="Admitted or under treatment"
      />
    </div>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="gap-1 py-5">
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
