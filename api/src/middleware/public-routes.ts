import type { Request } from "express";

// Explicit allowlist consumed by auth-middleware. A router mounted in app.ts is
// protected by default; a route has to be added here on purpose to be reachable
// without a valid JWT. (GET /api, the health check, is mounted before the auth gate.)
type PublicRoute =
  | { method: string; path: string; pathPrefix?: never }
  | { method: string; pathPrefix: string; path?: never };

export const PUBLIC_ROUTES: PublicRoute[] = [{ method: "POST", path: "/api/auth/login" }];

function matchesRoute(req: Request, route: PublicRoute) {
  if (route.method !== "ALL" && route.method !== req.method) {
    return false;
  }
  if (route.pathPrefix) {
    return req.path === route.pathPrefix || req.path.startsWith(route.pathPrefix + "/");
  }
  return req.path === route.path;
}

export function isPublicRoute(req: Request) {
  return PUBLIC_ROUTES.some((route) => matchesRoute(req, route));
}
