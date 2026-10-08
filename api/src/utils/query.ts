import { z } from "zod";
import { isoDateSchema } from "./validate";

export const MAX_LIMIT = 100;

/** Treats an absent or "" query param as "not provided", as the list endpoints require. */
export function optionalParam<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}

/** `offset`/`limit` for list endpoints. */
export const paginationFields = {
  offset: optionalParam(
    z.coerce.number().int("must be a whole number").min(0, "must be 0 or more"),
  ).transform((value) => value ?? 0),
  limit: optionalParam(
    z.coerce
      .number()
      .int("must be a whole number")
      .min(1, "must be at least 1")
      .max(MAX_LIMIT, `must be at most ${MAX_LIMIT}`),
  ).transform((value) => value ?? 10),
};

/** Optional trimmed search text. */
export const searchParam = optionalParam(
  z.string().trim().max(120, "must be at most 120 characters"),
).transform((value) => value || undefined);

/** Optional calendar-day range fields. Combine with `refineDateRange`. */
export const dateRangeFields = {
  from: optionalParam(isoDateSchema),
  to: optionalParam(isoDateSchema),
};

export function refineDateRange(value: { from?: string; to?: string }, ctx: z.RefinementCtx) {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({ code: "custom", message: "must be on or before to", path: ["from"] });
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

/** Escapes user input for safe use inside a RegExp (prevents ReDoS / regex injection). */
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Anchored, case-sensitive prefix match: can use an index on the (normalized) field. */
function prefixRegex(value: string) {
  return new RegExp(`^${escapeRegex(value)}`);
}

/** Name/email prefix search, or phone prefix search when the text starts like a number. */
export function buildSearchFilter(q: string) {
  const startsLikePhone = /^[+\d(]/.test(q);
  return startsLikePhone
    ? [{ phone: prefixRegex(q) }]
    : [{ nameLower: prefixRegex(q.toLowerCase()) }, { email: prefixRegex(q.toLowerCase()) }];
}

/** Accepts `field` or `-field` from an allowlist and returns a Mongo sort with an `_id` tiebreaker. */
export function sortParam<T extends string>(
  fields: Record<T, string>,
  fallback: NoInfer<`${"" | "-"}${T}`>,
) {
  const keys = Object.keys(fields) as T[];
  const values = keys.flatMap((key) => [key, `-${key}`]);
  return optionalParam(z.string())
    .refine(
      (value) => value === undefined || values.includes(value),
      `must be one of: ${values.join(", ")}`,
    )
    .transform((value = fallback) => {
      const direction = value.startsWith("-") ? -1 : 1;
      const key = value.replace(/^-/, "") as T;
      const sort: Record<string, 1 | -1> = { [fields[key]]: direction, _id: direction };
      return sort;
    });
}
