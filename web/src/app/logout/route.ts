import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/data/session';

/** Clears a session the API rejected, then sends the user to /login. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.nextUrl));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
