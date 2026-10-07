import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254));

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number');

export const personNameSchema = z
  .string()
  .trim()
  .min(2, 'Must be at least 2 characters')
  .max(100, 'Must be at most 100 characters');

/** Rejects update payloads with no fields. */
export const nonEmpty = (value: object) => Object.keys(value).length > 0;
export const NON_EMPTY_MESSAGE = 'Provide at least one field to update';
