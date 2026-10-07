import type { Types } from 'mongoose';
import { toDateRangeFilter } from '../../utils/query.js';
import { Doctor } from '../doctors/doctor.model.js';
import { CONDITIONS } from '../patients/patient.constants.js';
import { Patient } from '../patients/patient.model.js';
import type {
  AdmissionsQuery,
  Interval,
  PatientsPerDoctorQuery,
  StatsRange,
} from './stats.schema.js';

const DAY_MS = 86_400_000;

const toUtcDay = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const toIsoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Every stats query filters on admissionDate, served by the { admissionDate, _id } index. */
function admissionMatch(range: StatsRange) {
  const admissionDate = toDateRangeFilter(range);
  return admissionDate ? { admissionDate } : {};
}

/** The window of equal length right before `range`, for period-over-period deltas. */
function previousRange({ from, to }: StatsRange): StatsRange | undefined {
  if (!from || !to) return undefined;
  const days = Math.round((toUtcDay(to).getTime() - toUtcDay(from).getTime()) / DAY_MS) + 1;
  const prevTo = new Date(toUtcDay(from).getTime() - DAY_MS);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * DAY_MS);
  return { from: toIsoDay(prevFrom), to: toIsoDay(prevTo) };
}

/** Earliest admission date: an index seek on { admissionDate }, not a scan. */
async function earliestAdmission() {
  const first = await Patient.findOne({}, { admissionDate: 1 })
    .sort({ admissionDate: 1 })
    .lean<{ admissionDate: Date }>();
  return first?.admissionDate;
}

/**
 * Separate index-backed counts run in parallel. (A single $facet would be one round
 * trip, but $facet sub-pipelines cannot use indexes.)
 */
export async function getSummary(range: StatsRange) {
  const previous = previousRange(range);

  const [totalDoctors, totalPatients, admissions, previousCount, currentlyAdmitted, earliest] =
    await Promise.all([
      Doctor.estimatedDocumentCount(),
      Patient.estimatedDocumentCount(),
      Patient.countDocuments(admissionMatch(range)),
      previous ? Patient.countDocuments(admissionMatch(previous)) : Promise.resolve(null),
      Patient.countDocuments({ status: { $in: ['admitted', 'under_treatment'] } }),
      earliestAdmission(),
    ]);

  // A comparison is only honest when records cover the whole previous period;
  // otherwise a partly empty window inflates the change (e.g. "+2000%").
  const comparable = !!previous && !!earliest && toIsoDay(earliest) <= previous.from!;
  const previousAdmissions = comparable ? previousCount : null;

  return {
    totalDoctors,
    totalPatients,
    avgPatientsPerDoctor: totalDoctors ? Math.round((totalPatients / totalDoctors) * 10) / 10 : 0,
    currentlyAdmitted,
    admissions,
    previousAdmissions,
    range: { from: range.from ?? null, to: range.to ?? null },
    previousRange: comparable ? previous : null,
  };
}

/** Top doctors by patient count: group first, then $lookup only the top N doctors. */
export async function getPatientsPerDoctor({ limit, ...range }: PatientsPerDoctorQuery) {
  return Patient.aggregate<{
    doctorId: Types.ObjectId;
    name: string;
    specialization: string;
    count: number;
  }>([
    { $match: admissionMatch(range) },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: Doctor.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'doctor',
        pipeline: [{ $project: { name: 1, specialization: 1 } }],
      },
    },
    { $unwind: '$doctor' },
    {
      $project: {
        _id: 0,
        doctorId: '$_id',
        name: '$doctor.name',
        specialization: '$doctor.specialization',
        count: 1,
      },
    },
  ]);
}

function pickInterval(from: Date, to: Date): Interval {
  const days = (to.getTime() - from.getTime()) / DAY_MS + 1;
  if (days <= 45) return 'day';
  if (days <= 190) return 'week';
  return 'month';
}

/** Start of the bucket containing `date` (UTC; weeks start on Monday, like $dateTrunc below). */
function truncate(date: Date, interval: Interval) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (interval === 'month') d.setUTCDate(1);
  if (interval === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

function nextBucket(date: Date, interval: Interval) {
  const d = new Date(date);
  if (interval === 'day') d.setUTCDate(d.getUTCDate() + 1);
  if (interval === 'week') d.setUTCDate(d.getUTCDate() + 7);
  if (interval === 'month') d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

/** Admissions per day/week/month with empty buckets filled with 0 for a continuous series. */
export async function getAdmissions(query: AdmissionsQuery) {
  let from = query.from ? toUtcDay(query.from) : undefined;
  const to = query.to ? toUtcDay(query.to) : truncate(new Date(), 'day');

  if (!from) {
    // "All time": start at the earliest admission.
    const first = await earliestAdmission();
    from = first ? truncate(first, 'day') : to;
  }

  const interval = query.interval ?? pickInterval(from, to);

  const rows = await Patient.aggregate<{ _id: Date; count: number }>([
    { $match: { admissionDate: { $gte: from, $lte: new Date(to.getTime() + DAY_MS - 1) } } },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: '$admissionDate',
            unit: interval,
            timezone: 'UTC',
            startOfWeek: 'monday',
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = new Map(rows.map((row) => [row._id.getTime(), row.count]));
  const now = Date.now();
  const buckets: { date: string; count: number; partial?: true }[] = [];
  for (let cursor = truncate(from, interval); cursor <= to; cursor = nextBucket(cursor, interval)) {
    // A bucket that has not ended yet (e.g. this month so far) is flagged so charts
    // don't present the incomplete count as a drop.
    const isPartial = nextBucket(cursor, interval).getTime() > now;
    buckets.push({
      date: toIsoDay(cursor),
      count: counts.get(cursor.getTime()) ?? 0,
      ...(isPartial && { partial: true as const }),
    });
  }

  return { interval, data: buckets };
}

/** Patients per condition (every condition present, zero-filled), largest first. */
export async function getConditions(range: StatsRange) {
  const rows = await Patient.aggregate<{ _id: string; count: number }>([
    { $match: admissionMatch(range) },
    { $group: { _id: '$condition', count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return CONDITIONS.map((condition) => ({ condition, count: counts.get(condition) ?? 0 })).sort(
    (a, b) => b.count - a.count,
  );
}
