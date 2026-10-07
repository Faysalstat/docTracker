'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { AdmissionInterval, AdmissionsSeries } from '@/types/stats';

const config = {
  complete: { label: 'Admissions', color: 'var(--chart-1)' },
  partial: { label: 'Admissions (to date)', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const TICK_FORMAT: Record<AdmissionInterval, Intl.DateTimeFormatOptions> = {
  day: { month: 'short', day: 'numeric', timeZone: 'UTC' },
  week: { month: 'short', day: 'numeric', timeZone: 'UTC' },
  month: { month: 'short', year: '2-digit', timeZone: 'UTC' },
};

const LABEL_FORMAT: Record<AdmissionInterval, Intl.DateTimeFormatOptions> = {
  day: { dateStyle: 'medium', timeZone: 'UTC' },
  week: { dateStyle: 'medium', timeZone: 'UTC' },
  month: { month: 'long', year: 'numeric', timeZone: 'UTC' },
};

const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', options).format(new Date(`${iso}T00:00:00Z`));

interface ChartPoint {
  date: string;
  partial?: boolean;
  /** Value on the solid series (completed periods). */
  complete?: number;
  /** Value on the dashed series (the period in progress, joined to the last complete one). */
  inProgress?: number;
}

/**
 * Splits the series so the period still in progress is drawn dashed: an incomplete
 * count shown as a normal point reads as a sudden drop.
 */
function toChartPoints(data: AdmissionsSeries['data']): ChartPoint[] {
  const partialIndex = data.findIndex((bucket) => bucket.partial);
  return data.map((bucket, index) => ({
    date: bucket.date,
    partial: bucket.partial,
    complete: bucket.partial ? undefined : bucket.count,
    inProgress:
      partialIndex !== -1 && (index === partialIndex || index === partialIndex - 1)
        ? bucket.count
        : undefined,
  }));
}

function tooltipLabel(point: ChartPoint, interval: AdmissionInterval) {
  const base =
    interval === 'week'
      ? `Week of ${format(point.date, LABEL_FORMAT.week)}`
      : format(point.date, LABEL_FORMAT[interval]);
  return point.partial ? `${base} (to date)` : base;
}

export function AdmissionsChart({ series }: { series: AdmissionsSeries }) {
  const { interval } = series;
  const points = toChartPoints(series.data);

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full" aria-hidden>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeWidth={1} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) => format(value, TICK_FORMAT[interval])}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} width={36} allowDecimals={false} />
        <ChartTooltip
          cursor={{ strokeWidth: 1 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as ChartPoint | undefined;
            // One row per period: the joint point carries both series; keep the solid one.
            const rows = payload?.filter((item) =>
              point?.partial ? item.dataKey === 'inProgress' : item.dataKey === 'complete',
            );
            return (
              <ChartTooltipContent
                active={active}
                payload={rows}
                indicator="line"
                labelFormatter={() => (point ? tooltipLabel(point, interval) : null)}
              />
            );
          }}
        />
        <Area
          dataKey="complete"
          name="complete"
          type="monotone"
          stroke="var(--color-complete)"
          strokeWidth={2}
          fill="var(--color-complete)"
          fillOpacity={0.1}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Area
          dataKey="inProgress"
          name="partial"
          type="monotone"
          stroke="var(--color-partial)"
          strokeWidth={2}
          strokeDasharray="5 4"
          fill="var(--color-partial)"
          fillOpacity={0.04}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
