/** Every API response: `{ isSuccess, message, body }` (body is null on failure). */
export interface ApiEnvelope<T> {
  isSuccess: boolean;
  message: string;
  body: T;
}

/** List body returned by the API: one page of rows plus the total number of matches. */
export interface ApiList<T> {
  data: T[];
  length: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Result returned by Server Actions to the client. Never contains raw records. */
export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> };
