import 'server-only';
import type { z } from 'zod';
import type { ActionResult } from '@/types/api';
import { ApiRequestError } from './api-client';

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
 */
export function apiErrorResult(
  error: unknown,
  conflict?: { field: string; message: string },
): ActionResult {
  if (!(error instanceof ApiRequestError)) throw error;

  if (error.status === 400 && error.errors?.length) {
    const fieldErrors: Record<string, string[]> = {};
    for (const { field, message } of error.errors) (fieldErrors[field] ??= []).push(message);
    return { ok: false, message: 'Please fix the highlighted fields.', fieldErrors };
  }
  if (error.status === 409 && conflict) {
    return { ok: false, fieldErrors: { [conflict.field]: [conflict.message] } };
  }
  if (error.status === 404) {
    return { ok: false, message: 'This record no longer exists. Refresh the page.' };
  }
  if (error.status >= 500) {
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
  return { ok: false, message: error.message };
}
