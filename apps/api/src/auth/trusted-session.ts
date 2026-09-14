/**
 * Trusted tenant session for apps/api reads and writes.
 *
 * The organization and grantedScopes come from attachTrustedTenantSession,
 * which production middleware calls with a trusted-resolver result. A client
 * query, body organizationId, or body grantedScopes is not an input.
 * Cargo, title, hidden navigation, and page-local labels are not authority.
 *
 * sessionFromAuthenticatedRequest still reads the attached object so existing
 * controllers do not need a rewrite. Nest bootstrap (AppModule / main.ts) is
 * outside this file and does not yet register the middleware.
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
  const grantedScopes = [...source.grantedScopes];
  req.authenticatedSession = {
    authenticated: true,
    organizationId,
    grantedScopes,
  };
  return { organizationId, grantedScopes };
}

/**
 * One controller-style request path. Production middleware calls this after
 * the trusted resolver. Scopes come only from `resolve`, never from
 * the request body or a session already sitting on the request.
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

/** Express/Nest middleware production bootstrap can register. */
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
