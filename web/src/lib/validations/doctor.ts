import { z } from 'zod';
import { SPECIALIZATIONS } from '@/lib/constants';
import { emailSchema, personNameSchema, phoneSchema } from './common';

export const doctorFormSchema = z.object({
  name: personNameSchema,
  specialization: z.enum(SPECIALIZATIONS, 'Select a specialization'),
  hospital: z.string().trim().min(2, 'Must be at least 2 characters').max(120),
  phone: phoneSchema,
  email: emailSchema,
});

export type DoctorFormInput = z.infer<typeof doctorFormSchema>;
