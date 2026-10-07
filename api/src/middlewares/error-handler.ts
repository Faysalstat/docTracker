import { STATUS_CODES } from 'node:http';
import type { ErrorRequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { ApiError, type FieldError } from '../utils/api-error.js';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: FieldError[];
}

function sendProblem(res: Response, problem: ProblemDetails) {
  res.status(problem.status).type('application/problem+json').json(problem);
}

function isDuplicateKeyError(err: unknown): err is { code: number; keyValue?: object } {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return typeof err === 'object' && err !== null && 'type' in err && 'status' in err;
}

/** Maps every error to an RFC 9457 problem+json response. Never leaks internals on 5xx. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const base = { type: 'about:blank', instance: req.originalUrl };
  const problem = (status: number, detail: string, errors?: FieldError[]) =>
    sendProblem(res, {
      ...base,
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail,
      ...(errors && { errors }),
    });

  if (err instanceof ApiError) {
    return problem(err.status, err.message, err.errors);
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return problem(400, 'Validation failed', errors);
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0];
    return problem(409, field ? `A record with this ${field} already exists` : 'Duplicate record');
  }

  if (isBodyParserError(err) && err.status < 500) {
    const detail =
      err.type === 'entity.parse.failed' ? 'Malformed JSON body' : 'Invalid request body';
    return problem(err.status, detail);
  }

  logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');
  return problem(500, 'An unexpected error occurred');
};
