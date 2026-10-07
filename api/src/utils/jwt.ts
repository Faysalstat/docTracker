import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import type { UserRole } from '../modules/users/user.model.js';

const ISSUER = 'doctor-tracker-api';
const AUDIENCE = 'doctor-tracker-web';
const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export async function signAccessToken(payload: AccessTokenPayload) {
  const token = await new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);

  const { exp } = await verifyAccessTokenClaims(token);
  return { token, expiresAt: new Date(exp * 1000) };
}

async function verifyAccessTokenClaims(token: string) {
  const { payload } = await jwtVerify<{ role: UserRole }>(token, secret, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (!payload.sub || !payload.exp) throw new Error('Token is missing required claims');
  return { sub: payload.sub, role: payload.role, exp: payload.exp };
}

/** Returns the payload, or null when the token is missing, malformed, expired or forged. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { sub, role } = await verifyAccessTokenClaims(token);
    return { sub, role };
  } catch {
    return null;
  }
}
