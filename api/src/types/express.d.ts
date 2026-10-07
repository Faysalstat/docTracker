import type { AccessTokenPayload } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: AccessTokenPayload;
    }
  }
}

export {};
