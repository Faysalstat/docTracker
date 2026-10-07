'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatNumber } from '@/lib/format';

export interface RankedBarDatum {
  label: string;
  value: number;
  href?: Route;
}

const BAR_SIZE = 18; // <= 24px: thin marks, the band's leftover is air
const ROW_HEIGHT = 34;

/**
 * Horizontal bars for comparing magnitude across categories: one hue (no color
 * encoding needed), 4px rounded data-end, square at the baseline, value at the tip.
 */
export function RankedBarChart({
  data,
  valueLabel,
  labelWidth = 140,
}: {
  data: RankedBarDatum[];
  valueLabel: string;
  labelWidth?: number;
}) {
  const router = useRouter();
  const config = { value: { label: valueLabel, color: 'var(--chart-1)' } } satisfies ChartConfig;
  const max = Math.max(...data.map((datum) => datum.value), 1);

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: data.length * ROW_HEIGHT + 8 }}
      aria-hidden
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
        <XAxis type="number" dataKey="value" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          tickFormatter={(value: string) => (value.length > 20 ? `${value.slice(0, 19)}…` : value)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" nameKey="value" />}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          barSize={BAR_SIZE}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          className={data.some((datum) => datum.href) ? 'cursor-pointer' : undefined}
          onClick={(entry: { payload?: RankedBarDatum }) => {
            const href = entry.payload?.href;
            if (href) router.push(href);
          }}
        >
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground text-xs font-medium"
            formatter={(value: unknown) => formatNumber(Number(value))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
