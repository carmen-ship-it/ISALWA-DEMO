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

  const providerSubject = data.user.id;
  const authIdentity = await store.findAuthIdentityByProviderSubject('supabase', providerSubject);
  if (!authIdentity || authIdentity.status !== 'active') {
    throw new Error('AUTH_REQUIRED');
  }

  const orgHint = req.header(HEADER_ORG)?.trim();
  const member = await store.findActiveMemberForPerson(authIdentity.personId, orgHint);
  if (!member || member.accessStatus !== 'active') {
    throw new Error('ACCESS_REVOKED');
  }

  if (orgHint && member.organizationId !== orgHint) {
    throw new Error('TENANT_FORBIDDEN');
  }

  return {
    organizationId: member.organizationId,
    actorMemberId: member.id,
    personId: authIdentity.personId,
    authIdentityId: authIdentity.id,
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
