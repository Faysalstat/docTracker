import type { RequestHandler } from 'express';
import { ApiError } from '../utils/api-error.js';

export const notFound: RequestHandler = (req) => {
  throw ApiError.notFound(`Route ${req.method} ${req.path} not found`);
};
