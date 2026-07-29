export interface GithubOAuthCredentials {
  clientId: string
  clientSecret: string
}

export interface GithubIdentity {
  githubSubject: string
}

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const OAUTH_FETCH_TIMEOUT_MS = 10_000

/**
 * No `scope` is requested — GitHub's numeric user id (the stable subject this product keys
 * on) is readable with no scope at all, so the minimum identity scope is none. `redirect_uri`
 * is deliberately omitted: GitHub falls back to the callback URL registered on the OAuth App
 * itself, so this code never carries an environment-specific base URL as a second thing to
 * keep allowlisted.
 */
export function buildGithubAuthorizeUrl(clientId: string, state: string): string {
  const url = new URL(GITHUB_AUTHORIZE_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('state', state)
  return url.toString()
}

/**
 * Exchanges an authorization code server-side and fetches the stable GitHub subject. The
 * access token is held only in a local variable for the two calls it takes to do that and is
 * then let go — it is never returned, stored or logged. `fetchImpl` defaults to the global
 * `fetch`; tests inject a stub since there is no live GitHub OAuth app registered for CI.
 */
export async function completeGithubLogin(
  credentials: GithubOAuthCredentials,
  code: string,
  fetchImpl: typeof fetch = fetch
): Promise<GithubIdentity> {
  const tokenResponse = await fetchImpl(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ client_id: credentials.clientId, client_secret: credentials.clientSecret, code }),
    signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS)
  })
  if (!tokenResponse.ok) throw new Error('GitHub token exchange failed')

  const tokenBody = (await tokenResponse.json()) as { access_token?: string }
  const accessToken = tokenBody.access_token
  if (!accessToken) throw new Error('GitHub token exchange returned no access token')

  const userResponse = await fetchImpl(GITHUB_USER_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'build-my-deck'
    },
    signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS)
  })
  // `accessToken` is not referenced again after this call and is discarded when this function returns.
  if (!userResponse.ok) throw new Error('GitHub user lookup failed')

  const userBody = (await userResponse.json()) as { id?: number }
  if (typeof userBody.id !== 'number') throw new Error('GitHub user lookup returned no stable id')

  return { githubSubject: String(userBody.id) }
}
