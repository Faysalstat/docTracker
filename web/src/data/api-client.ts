import 'server-only';
import { redirect } from 'next/navigation';
import type { FieldError, ProblemDetails } from '@/types/api';
import { env } from './env';

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: FieldError[],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Session token. When set, a 401 from the API ends the session. */
  token?: string;
}

/** Server-to-server call to the Express API. Never imported by client code. */
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

  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiRequestError(res.status, problem?.detail ?? res.statusText, problem?.errors);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
