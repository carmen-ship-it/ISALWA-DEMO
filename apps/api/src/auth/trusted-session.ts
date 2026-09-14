/**
 * Trusted tenant session for apps/api reads and writes.
 *
 * The organization comes from an already-authenticated session. A client
 * query or body organizationId is not an input and must not be read.
 * Cargo, title, hidden navigation, and page-local labels are not authority.
 */

export type TrustedTenantSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export type TenantDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type AuthenticatedTenantRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  body?: { organizationId?: string };
};

export function trustedOrganizationId(
  session: { organizationId?: string | null } | null | undefined,
): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function holdsExactScope(
  granted: readonly string[] | undefined,
  required: string,
): boolean {
  return (granted ?? []).some((scope) => scope.trim() === required);
}

/**
 * Only a session already marked authenticated is trusted.
 * query.organizationId and body.organizationId are intentionally unread.
 */
export function sessionFromAuthenticatedRequest(
  req: AuthenticatedTenantRequest | undefined,
): TrustedTenantSession | null {
  const raw = req?.authenticatedSession;
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as {
    authenticated?: unknown;
    organizationId?: unknown;
    grantedScopes?: unknown;
  };
  if (candidate.authenticated !== true) return null;
  if (typeof candidate.organizationId !== 'string') return null;
  const organizationId = candidate.organizationId.trim();
  if (!organizationId) return null;
  if (!Array.isArray(candidate.grantedScopes)) return null;
  if (!candidate.grantedScopes.every((scope) => typeof scope === 'string')) return null;
  return {
    organizationId,
    grantedScopes: candidate.grantedScopes,
  };
}
