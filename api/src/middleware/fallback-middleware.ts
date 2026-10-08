import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/http-response";

// Mounted after every router. Without these, Express answers unknown routes and
// body-parser failures with its default HTML page (and a stack trace in development).

export function notFoundMiddleware(req: Request, res: Response) {
  return sendError(res, { message: `Route ${req.method} ${req.path} not found`, statusCode: 404 });
}

// Controllers catch their own errors, so only body-parser and middleware errors land here.
export function errorMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const type = (error as { type?: unknown }).type;
    const message = type === "entity.parse.failed" ? "Malformed JSON body" : "Invalid request body";
    return sendError(res, { message, statusCode: status });
  }

  console.error("Unhandled error", req.method, req.originalUrl, error);
  return sendError(res, { message: "Something went wrong", statusCode: 500 });
}
