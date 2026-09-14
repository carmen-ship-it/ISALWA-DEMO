import { writeAttachedSession } from '@isalwa/os-request-session';

/**
 * Reads the session written by attachCanonicalTrustedSession.
 * Production apps/api registration is CanonicalSessionMiddleware in AppModule.
 * This file does not resolve membership and must not be registered instead.
 * A client query, body organizationId, or body grantedScopes is not an input.
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

export type TrustedSessionSource = {
  organizationId: string;
  grantedScopes: readonly string[];
};

/**
 * Writes the trusted-resolver result onto the request.
 * Does not read req.body, req.query, cargo, title, or any pre-set session.
 * A denial must pass null so a stronger test-injected object cannot remain.
 */
export function attachTrustedTenantSession(
  req: AuthenticatedTenantRequest,
  source: TrustedSessionSource | null,
): TrustedTenantSession | null {
  if (!source || typeof source.organizationId !== 'string') {
    req.authenticatedSession = undefined;
    return null;
  }
  const organizationId = source.organizationId.trim();
  if (!organizationId) {
    req.authenticatedSession = undefined;
    return null;
  }
  if (!Array.isArray(source.grantedScopes)) {
    req.authenticatedSession = undefined;
    return null;
  }
  if (!source.grantedScopes.every((scope) => typeof scope === 'string')) {
    req.authenticatedSession = undefined;
    return null;
  }
  const attached = writeAttachedSession(req, { organizationId, grantedScopes: source.grantedScopes });
  return attached;
}

/**
 * Test helper. Production bootstrap does not call this.
 * CanonicalSessionMiddleware is the registered apps/api path.
 */
export async function readControllerTrustedSession(
  req: AuthenticatedTenantRequest,
  resolve: (req: AuthenticatedTenantRequest) => Promise<TrustedSessionSource | null>,
): Promise<TrustedTenantSession | null> {
  const resolved = await resolve(req);
  attachTrustedTenantSession(req, resolved);
  return sessionFromAuthenticatedRequest(req);
}

export type TrustedSessionMiddleware = (
  req: AuthenticatedTenantRequest,
  res: unknown,
  next: (err?: unknown) => void,
) => Promise<void>;

/** Not registered by AppModule. Production uses CanonicalSessionMiddleware. */
export function trustedSessionMiddleware(
  resolve: (req: AuthenticatedTenantRequest) => Promise<TrustedSessionSource | null>,
): TrustedSessionMiddleware {
  return async function attachResolvedTrustedSession(req, _res, next) {
    try {
      await readControllerTrustedSession(req, resolve);
      next();
    } catch (err) {
      next(err);
    }
  };
}
