import { z } from 'zod';
import { dateRangeFields, refineDateRange } from '../../utils/query.js';

export const statsRangeSchema = z.object(dateRangeFields).superRefine(refineDateRange);

export const patientsPerDoctorQuerySchema = z
  .object({
    ...dateRangeFields,
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .superRefine(refineDateRange);

export const INTERVALS = ['day', 'week', 'month'] as const;
export type Interval = (typeof INTERVALS)[number];

export const admissionsQuerySchema = z
  .object({
    ...dateRangeFields,
    /** Bucket size; picked from the range length when omitted. */
    interval: z.enum(INTERVALS).optional(),
  })
  .superRefine(refineDateRange);

export type StatsRange = z.infer<typeof statsRangeSchema>;
export type PatientsPerDoctorQuery = z.infer<typeof patientsPerDoctorQuerySchema>;
export type AdmissionsQuery = z.infer<typeof admissionsQuerySchema>;
