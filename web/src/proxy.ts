import { type NextRequest, NextResponse } from 'next/server';
import { decrypt, SESSION_COOKIE } from '@/data/session';

const PUBLIC_ROUTES = new Set(['/login']);

/**
 * Optimistic auth check: verifies the session cookie and redirects.
 * Never calls the API; secure checks happen in the data layer and the API itself.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and /logout (which must work with an invalid cookie).
  matcher: [
    '/((?!api|logout|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
