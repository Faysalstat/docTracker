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
