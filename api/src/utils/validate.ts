import { z } from "zod";
import { mongoose } from "../connector/db-connector";

// Default messages are written as predicates so they read well after the field name
// ("email is required", "status must be one of: admitted, recovered").
z.config({
  customError: (issue) => {
    if (issue.code === "invalid_type") {
      return issue.input === undefined ? "is required" : `must be a ${issue.expected}`;
    }
    if (issue.code === "invalid_value") {
      return `must be one of: ${issue.values.join(", ")}`;
    }
    return undefined;
  },
});

/**
 * Parses request input and returns only the fields the schema declares (unknown keys
 * and `{ "$gt": "" }`-style operator values never get through). Throws the first problem
 * as a readable Error, e.g. "email must be a valid email address".
 */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const field = issue?.path.join(".");
  if (!issue) throw new Error("Invalid input");
  throw new Error(field ? `${field} ${issue.message}` : issue.message);
}

/** Turns Mongoose/driver errors into readable messages; other errors pass through. */
export function toReadableError(error: unknown): Error {
  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyValue ?? {})[0];
    return new Error(field ? `${field} already exists` : "Record already exists");
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const first = Object.values(error.errors)[0];
    return new Error(first?.message ?? "Validation failed");
  }
  return error instanceof Error ? error : new Error(String(error));
}

function isDuplicateKeyError(error: unknown): error is { code: number; keyValue?: object } {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000
  );
}

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "is invalid");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("must be a valid email address").max(254, "must be at most 254 characters"));

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, "must be a valid phone number");

export const personNameSchema = z
  .string()
  .trim()
  .min(2, "must be at least 2 characters")
  .max(100, "must be at most 100 characters");

export const isoDateSchema = z.iso.date("must use the YYYY-MM-DD format");

/** Rejects update payloads with no fields. */
export function assertHasFields(value: object) {
  if (Object.keys(value).length === 0) {
    throw new Error("Provide at least one field to update");
  }
}
