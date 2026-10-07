import { z } from 'zod';

export const RANGE_PRESETS = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  all: 'All time',
} as const;

export type RangePreset = keyof typeof RANGE_PRESETS;
export const DEFAULT_RANGE: RangePreset = '12m';

export const RANGE_OPTIONS = (Object.entries(RANGE_PRESETS) as [RangePreset, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const rangePresetSchema = z
  .enum(Object.keys(RANGE_PRESETS) as [RangePreset, ...RangePreset[]])
  .catch(DEFAULT_RANGE);

export interface ResolvedRange {
  preset: RangePreset;
  label: string;
  /** Inclusive UTC calendar days (YYYY-MM-DD); undefined = unbounded. */
  from?: string;
  to?: string;
}

const toIsoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Turns a preset into concrete UTC dates, relative to `now`. */
export function resolveRange(preset: RangePreset, now = new Date()): ResolvedRange {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysBack = (days: number) => {
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - (days - 1));
    return toIsoDay(from);
  };

  const label = RANGE_PRESETS[preset];
  switch (preset) {
    case '7d':
      return { preset, label, from: daysBack(7), to: toIsoDay(today) };
    case '30d':
      return { preset, label, from: daysBack(30), to: toIsoDay(today) };
    case '90d':
      return { preset, label, from: daysBack(90), to: toIsoDay(today) };
    case '12m': {
      // Whole months: from the 1st of the month 11 months ago, so monthly buckets are complete.
      const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
      return { preset, label, from: toIsoDay(from), to: toIsoDay(today) };
    }
    case 'all':
      return { preset, label };
  }
}
