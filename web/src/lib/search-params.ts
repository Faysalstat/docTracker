import { z } from 'zod';
import {
  CONDITIONS,
  DEFAULT_PAGE_SIZE,
  GENDERS,
  PAGE_SIZES,
  PATIENT_STATUSES,
  SPECIALIZATIONS,
} from '@/lib/constants';
import { OBJECT_ID_PATTERN } from '@/lib/validations/common';

export type RawSearchParams = Record<string, string | string[] | undefined>;

// URL params are untrusted and user-editable: invalid values fall back to defaults
// instead of erroring, so a bad link still renders a sensible page.
const page = z.coerce.number().int().min(1).catch(1);
const limit = z.coerce
  .number()
  .refine((value) => (PAGE_SIZES as readonly number[]).includes(value))
  .catch(DEFAULT_PAGE_SIZE);
const text = z.string().trim().max(100).optional().catch(undefined);
const isoDate = z.iso.date().optional().catch(undefined);
const sortOf = <T extends string>(fields: readonly T[]) =>
  z
    .enum(fields.flatMap((field) => [field, `-${field}`]) as [string, ...string[]])
    .optional()
    .catch(undefined);

const doctorListSchema = z.object({
  page,
  limit,
  q: text,
  specialization: z.enum(SPECIALIZATIONS).optional().catch(undefined),
  hospital: text,
  from: isoDate,
  to: isoDate,
  sort: sortOf(['name', 'createdAt']),
});

const patientListSchema = z.object({
  page,
  limit,
  q: text,
  condition: z.enum(CONDITIONS).optional().catch(undefined),
  status: z.enum(PATIENT_STATUSES).optional().catch(undefined),
  gender: z.enum(GENDERS).optional().catch(undefined),
  doctorId: z.string().regex(OBJECT_ID_PATTERN).optional().catch(undefined),
  from: isoDate,
  to: isoDate,
  sort: sortOf(['name', 'admissionDate', 'age']),
});

export type DoctorListParams = z.infer<typeof doctorListSchema>;
export type PatientListParams = z.infer<typeof patientListSchema>;

function parse<T extends { from?: string; to?: string }>(
  schema: z.ZodType<T>,
  raw: RawSearchParams,
) {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const params = schema.parse(flat);
  // A reversed range is almost certainly a mistake: swap rather than return nothing.
  if (params.from && params.to && params.from > params.to) {
    return { ...params, from: params.to, to: params.from };
  }
  return params;
}

export const parseDoctorListParams = (raw: RawSearchParams) => parse(doctorListSchema, raw);
export const parsePatientListParams = (raw: RawSearchParams) => parse(patientListSchema, raw);
