import 'server-only';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from './env';

export const SESSION_COOKIE = 'session';

// Must match the claims the API signs with (api/src/utils/jwt.ts).
const JWT_ISSUER = 'doctor-tracker-api';
const JWT_AUDIENCE = 'doctor-tracker-web';

export interface SessionPayload {
  userId: string;
  role: string;
}

/** Verifies the session JWT. Returns null if it is missing, expired, or forged. */
export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, env.jwtSecret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (!payload.sub || typeof payload.role !== 'string') return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function createSession(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}
