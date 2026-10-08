import 'server-only';
import { redirect } from 'next/navigation';
import type { ApiEnvelope } from '@/types/api';
import { env } from './env';

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Session token. When set, a 401 from the API ends the session. */
  token?: string;
}

/**
 * Server-to-server call to the Express API. Never imported by client code.
 * Unwraps the API's `{ isSuccess, message, body }` envelope and returns `body`.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, query, token } = options;

  const url = new URL(`${env.apiUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiRequestError(503, 'The service is temporarily unavailable. Please try again.');
  }

  if (res.status === 401 && token) {
    // Token rejected by the API (e.g. user removed): clear the cookie via the logout route.
    redirect('/logout');
  }

  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !envelope?.isSuccess) {
    throw new ApiRequestError(res.status, envelope?.message ?? res.statusText);
  }
  return envelope.body;
}

/** True when the API reported that the requested record does not exist ("X not found"). */
export function isNotFoundError(error: unknown) {
  return error instanceof ApiRequestError && error.message.endsWith(' not found');
}
