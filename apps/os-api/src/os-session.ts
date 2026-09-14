import type { Request } from 'express';
import type { RequestContext } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  attachCanonicalTrustedSession,
  resolveCanonicalRequestContext,
  type CanonicalSessionStore,
} from '@isalwa/os-request-session';
import type { TrustedContextDenial, TrustedContextResult } from '@isalwa/os-domain';
import { getRuntimeProfile } from './env-validation';

/**
 * Request session used by os-api controllers.
 * grantedScopes come from the shared canonical resolver. They are not read
 * from the request body. findActiveMemberForPerson is not a session path.
 */
export type OsSession = RequestContext & {
  grantedScopes: readonly string[];
};

export type AttachedTrustedSession = {
  authenticated: true;
  organizationId: string;
  grantedScopes: readonly string[];
};

const HEADER_CORRELATION = 'x-correlation-id';

function correlationId(req: Request): string {
  return req.header(HEADER_CORRELATION)?.trim() ?? createId();
}

export {
  organizationSelector,
  resolveAuthenticatedProviderSubject,
} from '@isalwa/os-request-session';

export type { AuthenticatedProviderSubject } from '@isalwa/os-request-session';

/**
 * os-api entry to the one canonical resolver. Attaches the same session object
 * apps/api middleware attaches. Does not call findActiveMemberForPerson.
 */
export async function resolveRequestTrustedContext(
  req: Request,
  store: CanonicalSessionStore,
  asOf: Date = new Date(),
): Promise<TrustedContextResult> {
  const result = await resolveCanonicalRequestContext(req, store, asOf);
  attachCanonicalTrustedSession(req, result);
  return result;
}

function throwSessionDenial(denial: TrustedContextDenial): never {
  if (denial === 'MEMBER_INACTIVE') throw new Error('ACCESS_REVOKED');
  throw new Error(denial);
}

async function sessionFromTrustedContext(
  req: Request,
  store: CanonicalSessionStore,
): Promise<OsSession> {
  const effectiveAt = new Date();
  const result = await resolveRequestTrustedContext(req, store, effectiveAt);
  if (!result.ok) throwSessionDenial(result.denial);
  return {
    organizationId: result.context.organizationId,
    actorMemberId: result.context.memberId,
    personId: result.context.personId,
    authIdentityId: result.context.authIdentityId,
    correlationId: correlationId(req),
    effectiveAt,
    grantedScopes: [...result.context.grantedScopes],
  };
}

export async function sessionFromDevHeaders(
  req: Request,
  store: OsWorkforceStore,
): Promise<OsSession> {
  if (getRuntimeProfile() !== 'development') throw new Error('AUTH_REQUIRED');
  const mode = process.env.OS_AUTH_MODE?.trim().toLowerCase() ?? 'dev';
  if (mode !== 'dev') throw new Error('AUTH_REQUIRED');
  return sessionFromTrustedContext(req, store);
}

export type AuthenticatedSessionView = {
  memberId: string;
  organizationId: string;
  accessStatus: 'active';
};

export function toAuthenticatedSessionView(session: {
  actorMemberId: string;
  organizationId: string;
}): AuthenticatedSessionView {
  const memberId = session.actorMemberId.trim();
  const organizationId = session.organizationId.trim();
  if (!memberId || !organizationId) throw new Error('AUTH_REQUIRED');
  return { memberId, organizationId, accessStatus: 'active' };
}

export function authenticatedSessionHttpError(err: unknown): { status: number; body: { code: string } } {
  const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
  if (code === 'AUTH_REQUIRED' || code === 'PROVIDER_NOT_CONFIGURED') {
    return { status: 401, body: { code } };
  }
  if (
    code === 'ACCESS_REVOKED' ||
    code === 'MEMBER_INACTIVE' ||
    code === 'TENANT_FORBIDDEN' ||
    code === 'PERMISSION_DENIED'
  ) {
    return { status: 403, body: { code } };
  }
  return { status: 500, body: { code: 'INTERNAL_ERROR' } };
}

export async function sessionFromSupabaseJwt(
  req: Request,
  store: OsWorkforceStore,
): Promise<OsSession> {
  const mode = process.env.OS_AUTH_MODE?.trim().toLowerCase();
  if (mode !== 'supabase') throw new Error('AUTH_REQUIRED');
  return sessionFromTrustedContext(req, store);
}

export async function resolveSession(req: Request, store: OsWorkforceStore): Promise<OsSession> {
  const mode = process.env.OS_AUTH_MODE?.trim().toLowerCase() ?? 'dev';
  if (mode !== 'dev' && mode !== 'supabase') {
    throw new Error('AUTH_CONFIGURATION_INVALID');
  }
  if (mode === 'supabase') return sessionFromSupabaseJwt(req, store);
  if (getRuntimeProfile() !== 'development') throw new Error('AUTH_REQUIRED');
  return sessionFromDevHeaders(req, store);
}
