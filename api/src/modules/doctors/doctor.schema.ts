import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.js';
import {
  dateRangeFields,
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
import { SPECIALIZATIONS } from './doctor.constants.js';

export const createDoctorSchema = z.object({
  name: personNameSchema,
  specialization: z.enum(SPECIALIZATIONS, 'Select a specialization'),
  hospital: z.string().trim().min(2, 'Must be at least 2 characters').max(120),
  phone: phoneSchema,
  email: emailSchema,
});

export const updateDoctorSchema = createDoctorSchema.partial().refine(nonEmpty, NON_EMPTY_MESSAGE);

export const listDoctorsQuerySchema = paginationSchema
  .extend({
    q: optionalTextSchema,
    specialization: z.enum(SPECIALIZATIONS).optional(),
    hospital: optionalTextSchema,
    ...dateRangeFields,
    sort: sortSchema({ name: 'nameLower', createdAt: 'createdAt' }, '-createdAt'),
  })
  .superRefine(refineDateRange);

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
