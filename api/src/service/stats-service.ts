import type { Request } from "express";
import { z } from "zod";
import { ADMISSION_INTERVALS, type AdmissionInterval, CONDITIONS } from "../model/enums";
import * as statsRepo from "../repository/stats-repo";
import { dateRangeFields, optionalParam, refineDateRange, toDateRangeFilter } from "../utils/query";
import { parseInput } from "../utils/validate";

const DAY_MS = 86_400_000;

type Range = { from?: string; to?: string };

const rangeSchema = z.object(dateRangeFields).superRefine(refineDateRange);

const patientsPerDoctorSchema = z
  .object({
    ...dateRangeFields,
    limit: optionalParam(
      z.coerce
        .number()
        .int("must be a whole number")
        .min(1, "must be at least 1")
        .max(20, "must be at most 20"),
    ).transform((value) => value ?? 10),
  })
  .superRefine(refineDateRange);

const admissionsSchema = z
  .object({
    ...dateRangeFields,
    // Bucket size; picked from the range length when omitted.
    interval: optionalParam(z.enum(ADMISSION_INTERVALS)),
  })
  .superRefine(refineDateRange);

const toUtcDay = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const toIsoDay = (date: Date) => date.toISOString().slice(0, 10);

function admissionMatch(range: Range): statsRepo.AdmissionMatch {
  const admissionDate = toDateRangeFilter(range);
  return admissionDate ? { admissionDate } : {};
}

/** The window of equal length right before `range`, for period-over-period deltas. */
function previousRange({ from, to }: Range) {
  if (!from || !to) return undefined;
  const days = Math.round((toUtcDay(to).getTime() - toUtcDay(from).getTime()) / DAY_MS) + 1;
  const prevTo = new Date(toUtcDay(from).getTime() - DAY_MS);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * DAY_MS);
  return { from: toIsoDay(prevFrom), to: toIsoDay(prevTo) };
}

export const getSummary = async (req: Request) => {
  const range = parseInput(rangeSchema, req.query);
  const previous = previousRange(range);

  const [totals, earliest] = await Promise.all([
    statsRepo.countTotals(admissionMatch(range), previous ? admissionMatch(previous) : null),
    statsRepo.findEarliestAdmission(),
  ]);

  // A comparison is only honest when records cover the whole previous period;
  // otherwise a partly empty window inflates the change (e.g. "+2000%").
  const comparable = !!previous && !!earliest && toIsoDay(earliest) <= previous.from;

  return {
    totalDoctors: totals.totalDoctors,
    totalPatients: totals.totalPatients,
    avgPatientsPerDoctor: totals.totalDoctors
      ? Math.round((totals.totalPatients / totals.totalDoctors) * 10) / 10
      : 0,
    currentlyAdmitted: totals.currentlyAdmitted,
    admissions: totals.admissions,
    previousAdmissions: comparable ? totals.previousAdmissions : null,
    range: { from: range.from ?? null, to: range.to ?? null },
    previousRange: comparable ? previous : null,
  };
};

export const getPatientsPerDoctor = async (req: Request) => {
  const { limit, ...range } = parseInput(patientsPerDoctorSchema, req.query);
  return statsRepo.countPatientsPerDoctor(admissionMatch(range), limit);
};

function pickInterval(from: Date, to: Date): AdmissionInterval {
  const days = (to.getTime() - from.getTime()) / DAY_MS + 1;
  if (days <= 45) return ADMISSION_INTERVALS.DAY;
  if (days <= 190) return ADMISSION_INTERVALS.WEEK;
  return ADMISSION_INTERVALS.MONTH;
}

/** Start of the bucket containing `date` (UTC; weeks start on Monday, like $dateTrunc). */
function truncate(date: Date, interval: AdmissionInterval) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (interval === ADMISSION_INTERVALS.MONTH) d.setUTCDate(1);
  if (interval === ADMISSION_INTERVALS.WEEK)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

function nextBucket(date: Date, interval: AdmissionInterval) {
  const d = new Date(date);
  if (interval === ADMISSION_INTERVALS.DAY) d.setUTCDate(d.getUTCDate() + 1);
  if (interval === ADMISSION_INTERVALS.WEEK) d.setUTCDate(d.getUTCDate() + 7);
  if (interval === ADMISSION_INTERVALS.MONTH) d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

/** Admissions per day/week/month with empty buckets filled with 0 for a continuous series. */
export const getAdmissions = async (req: Request) => {
  const params = parseInput(admissionsSchema, req.query);
  let from = params.from ? toUtcDay(params.from) : undefined;
  const to = params.to ? toUtcDay(params.to) : truncate(new Date(), ADMISSION_INTERVALS.DAY);

  if (!from) {
    // "All time": start at the earliest admission.
    const first = await statsRepo.findEarliestAdmission();
    from = first ? truncate(first, ADMISSION_INTERVALS.DAY) : to;
  }

  const interval = params.interval ?? pickInterval(from, to);
  const rows = await statsRepo.countAdmissionsByBucket(
    from,
    new Date(to.getTime() + DAY_MS - 1),
    interval,
  );

  const counts = new Map(rows.map((row) => [row._id.getTime(), row.count]));
  const now = Date.now();
  const data: { date: string; count: number; partial?: true }[] = [];
  for (let cursor = truncate(from, interval); cursor <= to; cursor = nextBucket(cursor, interval)) {
    // A bucket that has not ended yet (e.g. this month so far) is flagged so charts
    // don't present the incomplete count as a drop.
    const isPartial = nextBucket(cursor, interval).getTime() > now;
    data.push({
      date: toIsoDay(cursor),
      count: counts.get(cursor.getTime()) ?? 0,
      ...(isPartial && { partial: true as const }),
    });
  }

  return { interval, data };
};

/** Patients per condition (every condition present, zero-filled), largest first. */
export const getConditions = async (req: Request) => {
  const range = parseInput(rangeSchema, req.query);
  const rows = await statsRepo.countByCondition(admissionMatch(range));
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return Object.values(CONDITIONS)
    .map((condition) => ({ condition, count: counts.get(condition) ?? 0 }))
    .sort((a, b) => b.count - a.count);
};
