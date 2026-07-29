export interface OwnedResource {
  ownerId: string
}

export interface AuthenticatedSession {
  userId: string
}

/**
 * The one place ownership is decided, anywhere in this service: `session.userId ===
 * resource.ownerId`. There is no sharing, no public-visibility flag and no bypass role in
 * iteration 1 — a future deck/asset table is authorized through this same function.
 */
export function isOwner(session: AuthenticatedSession | null, resource: OwnedResource | undefined): boolean {
  if (!session || !resource) return false
  return session.userId === resource.ownerId
}
