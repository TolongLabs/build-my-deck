import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** The full set of typed public error codes this service can return — never a raw provider payload or stack. */
export type PublicErrorCode =
  | 'input_too_large'
  | 'capacity_busy'
  | 'run_budget_exceeded'
  | 'shared_pool_exhausted'
  | 'unauthorized'
  | 'not_found'
  | 'internal_error'

export interface HttpErrorResponseBody {
  error: { code: PublicErrorCode; message: string; retryAfterMs?: number }
}

export class HttpError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: PublicErrorCode
  readonly retryAfterMs?: number

  constructor(
    status: ContentfulStatusCode,
    code: PublicErrorCode,
    message: string,
    options?: { retryAfterMs?: number }
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.retryAfterMs = options?.retryAfterMs
  }

  toResponseBody(): HttpErrorResponseBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.retryAfterMs !== undefined ? { retryAfterMs: this.retryAfterMs } : {})
      }
    }
  }
}

export function inputTooLargeError(maxInputBytes: number): HttpError {
  return new HttpError(413, 'input_too_large', `Request body exceeds the ${maxInputBytes} byte limit`)
}

export function capacityBusyError(retryAfterMs: number): HttpError {
  return new HttpError(503, 'capacity_busy', 'The service is at capacity', { retryAfterMs })
}
