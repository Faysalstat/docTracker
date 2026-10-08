import 'server-only';
import type { z } from 'zod';
import type { ActionResult } from '@/types/api';
import { ApiRequestError, isNotFoundError } from './api-client';

export function validationFailed(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return { ok: false, message: 'Please fix the highlighted fields.', fieldErrors };
}

/**
 * Maps an API error to a form result. Anything that is not an API error is rethrown,
 * which also lets Next.js control-flow errors (redirect, notFound) propagate.
 * The API reports one readable message ("Doctor creation failed: email already exists");
 * fields are validated here first, so a server-side field error is rare.
 */
export function apiErrorResult(
  error: unknown,
  conflict?: { field: string; message: string },
): ActionResult {
  if (!(error instanceof ApiRequestError)) throw error;

  if (conflict && error.message.endsWith(`${conflict.field} already exists`)) {
    return { ok: false, fieldErrors: { [conflict.field]: [conflict.message] } };
  }
  if (isNotFoundError(error)) {
    return { ok: false, message: 'This record no longer exists. Refresh the page.' };
  }
  if (error.status >= 500) {
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
  return { ok: false, message: error.message };
}
