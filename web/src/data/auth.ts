import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { LoginInput } from '@/lib/validations/auth';
import type { LoginResponse, SessionUser } from '@/types/auth';
import { apiFetch } from './api-client';
import { createSession, decrypt, getSessionToken } from './session';

/**
 * Secure session check for every data request and Server Action.
 * Memoized per render pass; redirects to /login when there is no valid session.
 */
export const verifySession = cache(async () => {
  const token = await getSessionToken();
  const session = await decrypt(token);

  if (!token || !session) {
    redirect('/login');
  }

  return { ...session, token };
});

export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  return apiFetch<SessionUser>('/auth/me', { token: (await verifySession()).token });
});

/** Exchanges credentials for a session. Throws ApiRequestError (401) on bad credentials. */
export async function signIn(credentials: LoginInput) {
  const { token, expiresAt } = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });
  await createSession(token, new Date(expiresAt));
}
