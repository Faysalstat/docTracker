import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.js';
import {
  dateRangeFields,
  isoDateSchema,
  objectIdSchema,
  optionalTextSchema,
  refineDateRange,
  sortSchema,
} from '../../utils/query.js';
import {
  emailSchema,
  NON_EMPTY_MESSAGE,
  nonEmpty,
  personNameSchema,
  phoneSchema,
} from '../../utils/validators.js';
import { CONDITIONS, GENDERS, PATIENT_STATUSES } from './patient.constants.js';

const admissionDateSchema = isoDateSchema
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    'Admission date cannot be in the future',
  )
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

/** Patient fields, without the owning doctor (used by POST /doctors/:id/patients). */
export const patientFieldsSchema = z.object({
  name: personNameSchema,
  age: z.coerce.number().int('Age must be a whole number').min(0).max(120),
  gender: z.enum(GENDERS, 'Select a gender'),
  phone: phoneSchema,
  email: emailSchema.optional(),
  condition: z.enum(CONDITIONS, 'Select a condition'),
  status: z.enum(PATIENT_STATUSES).default('admitted'),
  admissionDate: admissionDateSchema,
});

export const createPatientSchema = patientFieldsSchema.extend({ doctorId: objectIdSchema });

export const updatePatientSchema = patientFieldsSchema
  .extend({ doctorId: objectIdSchema, status: z.enum(PATIENT_STATUSES) })
  .partial()
  .refine(nonEmpty, NON_EMPTY_MESSAGE);

const listPatientsBaseSchema = paginationSchema.extend({
  q: optionalTextSchema,
  condition: z.enum(CONDITIONS).optional(),
  status: z.enum(PATIENT_STATUSES).optional(),
  gender: z.enum(GENDERS).optional(),
  ...dateRangeFields,
  sort: sortSchema(
    { name: 'nameLower', admissionDate: 'admissionDate', age: 'age' },
    '-admissionDate',
  ),
});

/** GET /patients: may also filter by doctor. */
export const listPatientsQuerySchema = listPatientsBaseSchema
  .extend({ doctorId: objectIdSchema.optional() })
  .superRefine(refineDateRange);

/** GET /doctors/:id/patients: the doctor comes from the path. */
export const listDoctorPatientsQuerySchema = listPatientsBaseSchema.superRefine(refineDateRange);

export type PatientFieldsInput = z.infer<typeof patientFieldsSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
