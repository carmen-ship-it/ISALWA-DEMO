/**
 * One production request session path for apps/os-api and apps/api.
 *
 * Chain:
 * authenticated provider session
 * → canonical AuthIdentity
 * → active Member
 * → organization
 * → lifecycle
 * → stored capabilities
 * → trusted context
 *
 * x-os-organization-id semantics:
 * The header never establishes tenant authority and never creates an organization.
 * It may only select among active memberships already proven for the authenticated person.
 *
 * - exactly one eligible membership → use it
 * - several eligible memberships and the selector names one of them → use that membership
 * - selector names an organization the identity does not belong to → TENANT_FORBIDDEN
 * - several eligible memberships and no valid selector → fail closed, do not pick one
 *
 * Client organizationId, scope arrays, cargo, and title are ignored.
 * people.admin is not a manager shortcut. Inactive and suspended members fail closed.
 */

import { createClient } from '@supabase/supabase-js';
import {
  resolveTrustedMemberContext,
  type TrustedAuthIdentity,
  type TrustedContextDenial,
  type TrustedContextResult,
  type TrustedMembershipReader,
} from '@isalwa/os-domain';

export const HEADER_ORGANIZATION_SELECTOR = 'x-os-organization-id';

const HEADER_PERSON = 'x-os-person-id';
const HEADER_AUTH = 'x-os-auth-identity-id';

/**
 * Locked selector contract. Tests assert these sentences stay the implementation.
 */
export const OrganizationSelectorSemantics = {
  neverAuthority: true,
  neverCreatesOrganization: true,
  selectsOnlyProvenMemberships: true,
  singleMembershipUsesThatMembership: true,
  namedProvenMembershipUsesThatMembership: true,
  foreignSelector: 'TENANT_FORBIDDEN',
  ambiguousWithoutSelector: 'fail_closed',
} as const;

export type OrganizationSelectorSemantics = typeof OrganizationSelectorSemantics;

export type CanonicalRequest = {
  header(name: string): string | undefined;
  query?: { organizationId?: unknown };
  body?: unknown;
  authenticatedSession?: unknown;
};

export type AttachedCanonicalSession = {
  authenticated: true;
  organizationId: string;
  grantedScopes: readonly string[];
};

export type CanonicalSessionStore = TrustedMembershipReader & {
  findAuthIdentityById(id: string): Promise<TrustedAuthIdentity | null>;
};

type RuntimeProfile = 'development' | 'staging' | 'production';

function runtimeProfile(): RuntimeProfile {
  const explicit = process.env.OS_RUNTIME_PROFILE?.trim().toLowerCase();
  if (explicit === 'development' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

function authMode(): string {
  return process.env.OS_AUTH_MODE?.trim().toLowerCase() || 'dev';
}

/**
 * Selector only. Query and body organizationId are not selectors.
 */
export function organizationSelector(req: CanonicalRequest): string | null {
  const header = req.header(HEADER_ORGANIZATION_SELECTOR)?.trim();
  return header ? header : null;
}

function ignoredClientClaims(req: CanonicalRequest): {
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

export type AuthenticatedProviderSubject = {
  provider: string;
  providerSubject: string;
};

export async function resolveAuthenticatedProviderSubject(
  req: CanonicalRequest,
  store: Pick<CanonicalSessionStore, 'findAuthIdentityById'>,
): Promise<AuthenticatedProviderSubject> {
  const mode = authMode();
  if (mode !== 'dev' && mode !== 'supabase') {
    throw new Error('AUTH_CONFIGURATION_INVALID');
  }

  if (mode === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('PROVIDER_NOT_CONFIGURED');
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

  if (runtimeProfile() !== 'development') throw new Error('AUTH_REQUIRED');
  const authIdentityId = req.header(HEADER_AUTH)?.trim();
  const personId = req.header(HEADER_PERSON)?.trim();
  if (!authIdentityId || !personId) throw new Error('AUTH_REQUIRED');
  const auth = await store.findAuthIdentityById(authIdentityId);
  if (!auth || auth.personId !== personId || auth.status !== 'active' || !auth.providerSubject) {
    throw new Error('AUTH_REQUIRED');
  }
  return { provider: auth.provider, providerSubject: auth.providerSubject };
}

/**
 * Authoritative production session resolution.
 * Does not call findActiveMemberForPerson. Does not attach a session by itself.
 */
export async function resolveCanonicalRequestContext(
  req: CanonicalRequest,
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
        if (!inNamedOrg) return { ok: false, denial: 'TENANT_FORBIDDEN' satisfies TrustedContextDenial };
      }
    }
    return result;
  }

  if (selector && result.context.organizationId !== selector) {
    return { ok: false, denial: 'TENANT_FORBIDDEN' };
  }
  return result;
}

/**
 * The only writer of request.authenticatedSession.
 * A denial or an empty source clears a client-injected object.
 * Controllers must read this object. They must not rebuild scopes.
 */
export function writeAttachedSession(
  req: CanonicalRequest,
  source: { organizationId: string; grantedScopes: readonly string[] } | null,
): AttachedCanonicalSession | null {
  if (!source || typeof source.organizationId !== 'string') {
    req.authenticatedSession = undefined;
    return null;
  }
  const organizationId = source.organizationId.trim();
  if (!organizationId || !Array.isArray(source.grantedScopes)) {
    req.authenticatedSession = undefined;
    return null;
  }
  if (!source.grantedScopes.every((scope) => typeof scope === 'string')) {
    req.authenticatedSession = undefined;
    return null;
  }
  const attached: AttachedCanonicalSession = {
    authenticated: true,
    organizationId,
    grantedScopes: [...source.grantedScopes],
  };
  req.authenticatedSession = attached;
  return attached;
}

export function attachCanonicalTrustedSession(
  req: CanonicalRequest,
  result: TrustedContextResult,
): AttachedCanonicalSession | null {
  if (!result.ok) return writeAttachedSession(req, null);
  return writeAttachedSession(req, {
    organizationId: result.context.organizationId,
    grantedScopes: result.context.grantedScopes,
  });
}
