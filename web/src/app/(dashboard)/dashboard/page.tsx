import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChartCardSkeleton } from '@/components/charts/chart-card';
import { ListContent, ListStateProvider } from '@/components/data-table/list-state';
import { SelectFilter } from '@/components/data-table/select-filter';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_RANGE, RANGE_OPTIONS, rangePresetSchema, resolveRange } from '@/lib/date-range';
import { formatDate } from '@/lib/format';
import type { RawSearchParams } from '@/lib/search-params';
import { AdmissionsCard, ConditionsCard, TopDoctorsCard } from './_components/dashboard-widgets';
import { KpiCards, KpiCardsSkeleton } from './_components/kpi-cards';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader title="Dashboard" description="Doctors, patients and admissions at a glance." />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = (await searchParams).range;
  const range = resolveRange(rangePresetSchema.parse(Array.isArray(raw) ? raw[0] : raw));

  return (
    // One date-range control scopes every widget. Each widget streams independently;
    // on a range change the current numbers stay visible (dimmed) until the new ones arrive.
    <ListStateProvider>
      <div className="flex flex-wrap items-center gap-3">
        <SelectFilter
          param="range"
          label="Date range"
          options={RANGE_OPTIONS}
          defaultValue={DEFAULT_RANGE}
          className="sm:w-48"
        />
        {range.from && range.to && (
          <span className="text-muted-foreground text-sm">
            {formatDate(range.from)} – {formatDate(range.to)}
          </span>
        )}
      </div>
      <ListContent className="mt-6 space-y-6">
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCards range={range} />
        </Suspense>
        <Suspense fallback={<ChartCardSkeleton height={288} />}>
          <AdmissionsCard range={range} />
        </Suspense>
        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<ChartCardSkeleton height={344} />}>
            <TopDoctorsCard range={range} />
          </Suspense>
          <Suspense fallback={<ChartCardSkeleton height={212} />}>
            <ConditionsCard range={range} />
          </Suspense>
        </div>
      </ListContent>
    </ListStateProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-9 w-48" />
      <KpiCardsSkeleton />
      <ChartCardSkeleton height={288} />
    </div>
  );
}
