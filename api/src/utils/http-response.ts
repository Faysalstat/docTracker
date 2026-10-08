// Shared response envelope for every controller: { isSuccess, message, body }.
// 200 for success, 400 for business/validation errors, 401 reserved for auth failures.
import type { Response } from "express";

interface SuccessOptions {
  message?: string;
  body?: unknown;
  statusCode?: number;
}

interface ErrorOptions {
  message?: string;
  error?: unknown;
  statusCode?: number;
}

function sendSuccess(
  res: Response,
  { message = "Operation successful", body = null, statusCode = 200 }: SuccessOptions = {},
) {
  return res.status(statusCode).json({ isSuccess: true, message, body });
}

function sendError(
  res: Response,
  { message = "Operation failed", error, statusCode = 400 }: ErrorOptions = {},
) {
  const finalMessage =
    error instanceof Error && error.message ? `${message}: ${error.message}` : message;
  return res.status(statusCode).json({ isSuccess: false, message: finalMessage, body: null });
}

export { sendSuccess, sendError };
