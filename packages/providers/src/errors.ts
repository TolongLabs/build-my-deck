/** Stages never inspect HTTP status or provider payloads — every adapter normalizes into one of these. */
export type ProviderErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'quota_exhausted'
  | 'transient'
  | 'context_overflow'
  | 'invalid_structured_output'
  | 'refusal'
  | 'unsupported_capability'
  | 'aborted'

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind

  constructor(kind: ProviderErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.kind = kind
    this.name = 'ProviderError'
  }
}

export function isProviderError(value: unknown): value is ProviderError {
  return value instanceof ProviderError
}
