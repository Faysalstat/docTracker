export interface FieldError {
  field: string;
  message: string;
}

/** RFC 9457 error body returned by the API. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: FieldError[];
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
