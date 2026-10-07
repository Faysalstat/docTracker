import type { Request, RequestHandler } from 'express';
import { ApiError } from '../utils/api-error.js';
import { type AccessTokenPayload, verifyAccessToken } from '../utils/jwt.js';

/** Requires a valid `Authorization: Bearer <jwt>` header and attaches `req.user`. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized();
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  req.user = payload;
  next();
};

/** Returns the authenticated user; use only on routes behind `authenticate`. */
export function getAuthUser(req: Request): AccessTokenPayload {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
