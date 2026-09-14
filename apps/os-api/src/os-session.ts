import type { Request } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { RequestContext } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  resolveTrustedMemberContext,
  type TrustedContextDenial,
  type TrustedContextResult,
  type TrustedMembershipReader,
  type TrustedMemberContext,
} from '@isalwa/os-domain';
import { getRuntimeProfile } from './env-validation';

/**
 * Request session used by os-api controllers.
 * grantedScopes come from stored role and delegation assignments via
 * resolveTrustedMemberContext. They are not read from the request body.
 */
export type OsSession = RequestContext & {
  grantedScopes: readonly string[];
};

/** Shape Gate A's sessionFromAuthenticatedRequest already reads. */
export type AttachedTrustedSession = {
  authenticated: true;
  organizationId: string;
  grantedScopes: readonly string[];
};

const HEADER_ORG = 'x-os-organization-id';
const HEADER_PERSON = 'x-os-person-id';
const HEADER_AUTH = 'x-os-auth-identity-id';
const HEADER_CORRELATION = 'x-correlation-id';

function correlationId(req: Request): string {
  return req.header(HEADER_CORRELATION)?.trim() ?? createId();
}

type CanonicalSessionStore = TrustedMembershipReader &
  Parameters<typeof resolveAuthenticatedProviderSubject>[1];

type SessionCarrier = Request & { authenticatedSession?: AttachedTrustedSession };

/**
 * x-os-organization-id is not authority.
 * It may select among active memberships already proven for the authenticated
 * person. Query and body organizationId are not selectors. Client scope arrays,
 * cargo, and title grant nothing.
 */
export function organizationSelector(req: Request): string | null {
  const header = req.header(HEADER_ORG)?.trim();
  return header ? header : null;
}

function ignoredClientClaims(req: Request): {
  organizationId: string | null;
  grantedScopes: string[] | null;
  cargo: string | null;
  title: string | null;
} {
  const queryOrg = typeof req.query?.organizationId === 'string' ? req.query.organizationId : null;
  const body = req.body as
    | {
        organizationId?: unknown;
        grantedScopes?: unknown;
        scopes?: unknown;
        cargo?: unknown;
        title?: unknown;
      }
    | undefined;
  const bodyOrg = typeof body?.organizationId === 'string' ? body.organizationId : null;
  const claimedScopes = Array.isArray(body?.grantedScopes)
    ? body.grantedScopes.filter((scope): scope is string => typeof scope === 'string')
    : Array.isArray(body?.scopes)
      ? body.scopes.filter((scope): scope is string => typeof scope === 'string')
      : null;
  return {
    organizationId: queryOrg ?? bodyOrg,
    grantedScopes: claimedScopes,
    cargo: typeof body?.cargo === 'string' ? body.cargo : null,
    title: typeof body?.title === 'string' ? body.title : null,
  };
}

/**
 * Narrows the membership reader to one organization the caller asked to select.
 * The trusted resolver still proves identity, lifecycle, and stored grants.
 * An organization the person does not belong to yields no members, so the
 * resolver cannot succeed for that tenant.
 */
function readerForSelector(
  store: TrustedMembershipReader,
  selector: string | null,
): TrustedMembershipReader {
  if (!selector) return store;
  return {
    findAuthIdentityByProviderSubject: (provider, providerSubject) =>
      store.findAuthIdentityByProviderSubject(provider, providerSubject),
    async listMembersForPerson(personId) {
      const members = await store.listMembersForPerson(personId);
      return members.filter((member) => member.organizationId === selector);
    },
    listRoleAssignmentsForMember: (memberId) => store.listRoleAssignmentsForMember(memberId),
    listDelegationsForDelegate: (memberId) => store.listDelegationsForDelegate(memberId),
  };
}

function clearAttachedSession(req: Request): void {
  delete (req as SessionCarrier).authenticatedSession;
}

function attachTrustedSession(req: Request, context: TrustedMemberContext): AttachedTrustedSession {
  const attached: AttachedTrustedSession = {
    authenticated: true,
    organizationId: context.organizationId,
    grantedScopes: [...context.grantedScopes],
  };
  (req as SessionCarrier).authenticatedSession = attached;
  return attached;
}

function denied(req: Request, denial: TrustedContextDenial): TrustedContextResult {
  clearAttachedSession(req);
  return { ok: false, denial };
}

/**
 * Canonical chain for a live request:
 * authenticated provider session → AuthIdentity → active Member → organization
 * → lifecycle → stored capabilities → trusted context attached to the request.
 *
 * Does not call findActiveMemberForPerson. A multi-membership person with no
 * selector fails closed inside the trusted resolver. The header may only
 * narrow the membership list to an organization already on that person.
 */
export async function resolveRequestTrustedContext(
  req: Request,
  store: CanonicalSessionStore,
  asOf: Date = new Date(),
): Promise<TrustedContextResult> {
  const subject = await resolveAuthenticatedProviderSubject(req, store);
  const selector = organizationSelector(req);
  const claims = ignoredClientClaims(req);
  const result = await resolveTrustedMemberContext(readerForSelector(store, selector), {
    provider: subject.provider,
    providerSubject: subject.providerSubject,
    asOf,
    organizationId: claims.organizationId,
    grantedScopes: claims.grantedScopes,
    cargo: claims.cargo,
    title: claims.title,
  });

  if (!result.ok) {
    if (selector && result.denial === 'AUTH_REQUIRED') {
      const identity = await store.findAuthIdentityByProviderSubject(
        subject.provider,
        subject.providerSubject,
      );
      if (identity && identity.status === 'active' && identity.personId.trim()) {
        const members = await store.listMembersForPerson(identity.personId);
        const inNamedOrg = members.some((member) => member.organizationId === selector);
        if (!inNamedOrg) return denied(req, 'TENANT_FORBIDDEN');
      }
    }
    return denied(req, result.denial);
  }

  if (selector && result.context.organizationId !== selector) {
    return denied(req, 'TENANT_FORBIDDEN');
  }
  attachTrustedSession(req, result.context);
  return result;
}

function throwSessionDenial(denial: TrustedContextDenial): never {
  // Existing controllers map ACCESS_REVOKED to 403. MEMBER_INACTIVE is the
  // trusted-context denial; do not let those controllers turn it into 500.
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

/**
 * Dev-only identity proof. The organization header is still only a selector
 * among memberships of the authenticated person. Member id headers grant nothing.
 */
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

type MembershipStore = Pick<
  OsWorkforceStore,
  'findAuthIdentityByProviderSubject' | 'findActiveMemberForPerson'
>;

/**
 * Older membership probe kept for session-identity tests.
 * resolveSession does not call this. It silently accepts the store's first
 * active row and does not load grantedScopes. Do not use it to attach a session.
 */
export async function resolveActiveMembership(
  store: MembershipStore,
  input: { provider: 'supabase'; providerSubject: string; organizationHint?: string | null },
): Promise<AuthenticatedSessionView & { personId: string; authIdentityId: string }> {
  const providerSubject = input.providerSubject.trim();
  if (!providerSubject) throw new Error('AUTH_REQUIRED');

  const authIdentity = await store.findAuthIdentityByProviderSubject(input.provider, providerSubject);
  if (!authIdentity || authIdentity.status !== 'active') {
    throw new Error('AUTH_REQUIRED');
  }

  const organizationHint = input.organizationHint?.trim() || undefined;
  const member = await store.findActiveMemberForPerson(authIdentity.personId, organizationHint);
  if (!member || member.accessStatus !== 'active') {
    throw new Error('ACCESS_REVOKED');
  }
  if (member.personId !== authIdentity.personId) {
    throw new Error('TENANT_FORBIDDEN');
  }
  if (organizationHint && member.organizationId !== organizationHint) {
    throw new Error('TENANT_FORBIDDEN');
  }

  return {
    memberId: member.id,
    organizationId: member.organizationId,
    accessStatus: 'active',
    personId: authIdentity.personId,
    authIdentityId: authIdentity.id,
  };
}

/** Public session read. Omits person, auth identity, and any caller-supplied ids. */
export function toAuthenticatedSessionView(session: {
  actorMemberId: string;
  organizationId: string;
}): AuthenticatedSessionView {
  const memberId = session.actorMemberId.trim();
  const organizationId = session.organizationId.trim();
  if (!memberId || !organizationId) throw new Error('AUTH_REQUIRED');
  return { memberId, organizationId, accessStatus: 'active' };
}

/** Expected auth failures stay 401/403 with a code only — never a raw store error. */
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

/**
 * Production JWT path. Provider proof stays in resolveAuthenticatedProviderSubject.
 * Organization and scopes come from the trusted resolver, not findActiveMemberForPerson.
 */
export async function sessionFromSupabaseJwt(
  req: Request,
  store: OsWorkforceStore,
): Promise<OsSession> {
  const mode = process.env.OS_AUTH_MODE?.trim().toLowerCase();
  if (mode !== 'supabase') throw new Error('AUTH_REQUIRED');
  return sessionFromTrustedContext(req, store);
}

export async function resolveSession(req: Request, store: OsWorkforceStore): Promise<OsSession> {
  const raw = process.env.OS_AUTH_MODE?.trim().toLowerCase();
  const mode = raw ?? 'dev';

  if (mode !== 'dev' && mode !== 'supabase') {
    throw new Error('AUTH_CONFIGURATION_INVALID');
  }

  if (mode === 'supabase') {
    return sessionFromSupabaseJwt(req, store);
  }

  if (getRuntimeProfile() !== 'development') {
    throw new Error('AUTH_REQUIRED');
  }

  return sessionFromDevHeaders(req, store);
}

export type AuthenticatedProviderSubject = {
  provider: string;
  providerSubject: string;
};

/**
 * Proves the provider session and returns the subject already stored on
 * AuthIdentity. Does not select a Member and does not read organization or
 * scope claims. Membership selection belongs to the trusted context resolver.
 */
export async function resolveAuthenticatedProviderSubject(
  req: Request,
  store: Pick<OsWorkforceStore, 'findAuthIdentityById'>,
): Promise<AuthenticatedProviderSubject> {
  const raw = process.env.OS_AUTH_MODE?.trim().toLowerCase();
  const mode = raw ?? 'dev';
  if (mode !== 'dev' && mode !== 'supabase') {
    throw new Error('AUTH_CONFIGURATION_INVALID');
  }

  if (mode === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('PROVIDER_NOT_CONFIGURED');
    }
    const authHeader = req.header('authorization')?.trim();
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw new Error('AUTH_REQUIRED');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) throw new Error('AUTH_REQUIRED');
    return { provider: 'supabase', providerSubject: data.user.id };
  }

  if (getRuntimeProfile() !== 'development') {
    throw new Error('AUTH_REQUIRED');
  }

  const authIdentityId = req.header(HEADER_AUTH)?.trim();
  const personId = req.header(HEADER_PERSON)?.trim();
  if (!authIdentityId || !personId) throw new Error('AUTH_REQUIRED');

  const auth = await store.findAuthIdentityById(authIdentityId);
  if (!auth || auth.personId !== personId || auth.status !== 'active' || !auth.providerSubject) {
    throw new Error('AUTH_REQUIRED');
  }
  return { provider: auth.provider, providerSubject: auth.providerSubject };
}
