import { Types } from 'mongoose';
import { z } from 'zod';

/** Escapes user input for safe use inside a RegExp (prevents ReDoS / regex injection). */
export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Anchored, case-sensitive prefix match: can use an index on the (normalized) field. */
export function prefixRegex(value: string) {
  return new RegExp(`^${escapeRegex(value)}`);
}

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id')
  .refine((value) => Types.ObjectId.isValid(value), 'Invalid id');

export const idParamsSchema = z.object({ id: objectIdSchema });

export const isoDateSchema = z.iso.date('Use the YYYY-MM-DD format');

/** Optional calendar-day range fields for list queries. Combine with `refineDateRange`. */
export const dateRangeFields = {
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
};

export function refineDateRange(value: { from?: string; to?: string }, ctx: z.RefinementCtx) {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({ code: 'custom', message: '`from` must be on or before `to`', path: ['from'] });
  }
}

/** Inclusive range on UTC calendar days: `from` 00:00:00.000 to `to` 23:59:59.999. */
export function toDateRangeFilter(range: { from?: string; to?: string }) {
  if (!range.from && !range.to) return undefined;
  return {
    ...(range.from && { $gte: new Date(`${range.from}T00:00:00.000Z`) }),
    ...(range.to && { $lte: new Date(`${range.to}T23:59:59.999Z`) }),
  };
}

/** Optional trimmed text; empty strings are treated as "not provided". */
export const optionalTextSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => value || undefined);

/** Accepts `field` or `-field` from an allowlist and returns a Mongo sort with an `_id` tiebreaker. */
export function sortSchema<T extends string>(
  fields: Record<T, string>,
  fallback: NoInfer<`${'' | '-'}${T}`>,
) {
  const keys = Object.keys(fields) as T[];
  const values = keys.flatMap((key) => [key, `-${key}`]);
  return z
    .string()
    .default(fallback)
    .refine((value) => values.includes(value), `Sort must be one of: ${values.join(', ')}`)
    .transform((value) => {
      const direction = value.startsWith('-') ? -1 : 1;
      const key = value.replace(/^-/, '') as T;
      const sort: Record<string, 1 | -1> = { [fields[key]]: direction, _id: direction };
      return sort;
    });
}
