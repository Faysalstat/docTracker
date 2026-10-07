import { z } from 'zod';
import { CONDITIONS, GENDERS, PATIENT_STATUSES } from '@/lib/constants';
import { todayIso } from '@/lib/format';
import { emailSchema, OBJECT_ID_PATTERN, personNameSchema, phoneSchema } from './common';

export const patientFormSchema = z.object({
  name: personNameSchema,
  // Form values arrive as strings; an empty input must not coerce to 0.
  age: z.preprocess(
    (value) => (typeof value === 'string' ? (value.trim() ? Number(value) : undefined) : value),
    z
      .number('Enter an age')
      .int('Age must be a whole number')
      .min(0, 'Age must be 0 or more')
      .max(120, 'Age must be 120 or less'),
  ),
  gender: z.enum(GENDERS, 'Select a gender'),
  phone: phoneSchema,
  // Optional: an empty input means "no email".
  email: z.union([z.literal('').transform(() => undefined), emailSchema]).optional(),
  condition: z.enum(CONDITIONS, 'Select a condition'),
  status: z.enum(PATIENT_STATUSES, 'Select a status'),
  admissionDate: z.iso
    .date('Select an admission date')
    .refine((value) => value <= todayIso(), 'Admission date cannot be in the future'),
  doctorId: z.string().regex(OBJECT_ID_PATTERN, 'Select a doctor').optional(),
});

/** Creating from the patients page: the doctor is chosen in the form, so it is required. */
export const patientWithDoctorSchema = patientFormSchema.extend({
  doctorId: z.string('Select a doctor').regex(OBJECT_ID_PATTERN, 'Select a doctor'),
});

export type PatientFormInput = z.infer<typeof patientFormSchema>;
