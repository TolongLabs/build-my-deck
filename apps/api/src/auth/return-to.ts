const PLACEHOLDER_ORIGIN = 'https://placeholder.invalid'

/**
 * Restricts the post-login redirect target to a same-origin relative path — the allowlist
 * for the open-redirect surface an OAuth callback would otherwise expose. It requires the
 * deliberately conservative relative-path contract before resolving the candidate against a
 * fixed placeholder origin using the platform's own URL parser — the same parser a browser
 * applies to a `Location` header, including its authority-position handling of backslashes.
 */
export function sanitizeReturnTo(candidate: string | undefined | null): string {
  if (!candidate) return '/'
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\') ||
    candidate.includes('\\') ||
    candidate.includes('://')
  ) {
    return '/'
  }

  let resolved: URL
  try {
    resolved = new URL(candidate, PLACEHOLDER_ORIGIN)
  } catch {
    return '/'
  }

  if (resolved.origin !== PLACEHOLDER_ORIGIN) return '/'
  const path = resolved.pathname + resolved.search + resolved.hash
  return path.startsWith('//') || path.startsWith('/\\') ? '/' : path
}
