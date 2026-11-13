import type { ErrorCode } from './types';

/** `NETWORK` is client-side only: the request never got an HTTP response. */
export type ApiErrorCode = ErrorCode | 'NETWORK';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string = code,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(e: unknown, code?: ApiErrorCode): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}
