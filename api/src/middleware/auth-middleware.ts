import type { NextFunction, Request, Response } from "express";
import { USER_ROLES } from "../model/enums";
import { sendError } from "../utils/http-response";
import { verify } from "../utils/jwt";
import { isPublicRoute } from "./public-routes";

// Mounted globally in app.ts, before every router. Identity comes only from the
// verified JWT, never from client-supplied headers or the body.
export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isPublicRoute(req)) {
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return sendError(res, { message: "Authentication required", statusCode: 401 });
  }

  let decoded;
  try {
    decoded = verify(token);
  } catch {
    return sendError(res, { message: "Invalid or expired token", statusCode: 401 });
  }

  req.userId = decoded.userId;
  req.userRole = decoded.userRole;
  req.isAdmin = decoded.userRole === USER_ROLES.ADMIN;

  next();
}
