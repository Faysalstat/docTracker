import type { UserRole } from "../model/enums";

declare global {
  namespace Express {
    interface Request {
      // Set by auth-middleware from the verified JWT. Never read identity from the body or headers.
      userId?: string;
      userRole?: UserRole;
      isAdmin?: boolean;
    }
  }
}

export {};
