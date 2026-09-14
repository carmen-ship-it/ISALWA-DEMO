import type { Request } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { RequestContext } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getRuntimeProfile } from './env-validation';

export type OsSession = RequestContext;

const HEADER_ORG = 'x-os-organization-id';
const HEADER_MEMBER = 'x-os-member-id';
const HEADER_PERSON = 'x-os-person-id';
const HEADER_AUTH = 'x-os-auth-identity-id';
const HEADER_CORRELATION = 'x-correlation-id';

function correlationId(req: Request): string {
  return req.header(HEADER_CORRELATION)?.trim() ?? createId();
}

/** Dev-only: explicit session headers — validated against store before use. */
export async function sessionFromDevHeaders(
  req: Request,
  store: OsWorkforceStore,
): Promise<OsSession> {
  const organizationId = req.header(HEADER_ORG)?.trim();
  const actorMemberId = req.header(HEADER_MEMBER)?.trim();
  const personId = req.header(HEADER_PERSON)?.trim();
  const authIdentityId = req.header(HEADER_AUTH)?.trim();

  if (!organizationId || !actorMemberId || !personId || !authIdentityId) {
    throw new Error('AUTH_REQUIRED');
  }

  const member = await store.getMemberInOrg(organizationId, actorMemberId);
  if (!member || member.personId !== personId) {
    throw new Error('TENANT_FORBIDDEN');
  }
  if (member.accessStatus !== 'active') {
    throw new Error('ACCESS_REVOKED');
  }
  const auth = await store.findAuthIdentityById(authIdentityId);
  if (!auth || auth.personId !== personId || auth.status !== 'active') {
    throw new Error('TENANT_FORBIDDEN');
  }

  return {
    organizationId,
    actorMemberId,
    personId,
    authIdentityId,
    correlationId: correlationId(req),
    effectiveAt: new Date(),
  };
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
 * Canonical membership after the provider subject is known.
 * Caller-supplied member ids are not an input. An organization hint must match
 * the active membership or the read fails closed.
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
  if (code === 'ACCESS_REVOKED' || code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED') {
    return { status: 403, body: { code } };
  }
  return { status: 500, body: { code: 'INTERNAL_ERROR' } };
}

/** Production: JWT → provider subject → AuthIdentity → Member — never trust client member ids. */
export async function sessionFromSupabaseJwt(
  req: Request,
  store: OsWorkforceStore,
): Promise<OsSession> {
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
  if (error || !data.user) throw new Error('AUTH_REQUIRED');

  const membership = await resolveActiveMembership(store, {
    provider: 'supabase',
    providerSubject: data.user.id,
    organizationHint: req.header(HEADER_ORG)?.trim(),
  });

  return {
    organizationId: membership.organizationId,
    actorMemberId: membership.memberId,
    personId: membership.personId,
    authIdentityId: membership.authIdentityId,
    correlationId: correlationId(req),
    effectiveAt: new Date(),
  };
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
