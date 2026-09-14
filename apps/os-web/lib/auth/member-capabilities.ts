/**
 * Web server loader for the one trusted member context.
 *
 * Supabase cookie or dev session
 *   → getServerOsAuthContext (apps/os-web/lib/auth/actions.ts)
 *   → GET /session/authorization
 *   → os-api loadTrustedMemberContextFromRequest
 *   → AuthIdentity → active Member → stored assignments
 *   → acceptTrustedMemberContext
 *
 * GET /session/me and GET /members/:id are not the grant source. A member
 * summary roleKeys list is not a second session. Cargo and title grant
 * nothing. A held scope never implies another scope.
 *
 * A null result is denial, not an empty allow. This loader does not attach
 * an HTTP session for other API routes.
 */

import {
  acceptTrustedMemberContext,
  decideStoredGrant,
  lifecycleDenial,
  type TrustedCapabilityDecision,
  type TrustedMemberContext,
} from '@isalwa/os-domain';

/** Exact assignment strings this session check recognizes. None implies another. */
export const SESSION_CAPABILITY_SCOPES = [
  'commercial.team.read',
  'master_data.admin',
  'production.operational.record',
  'warehouse.finished_goods.receive',
  'warehouse.finished_goods.allocate',
  'operations.coordinator.record',
  'purchasing.operational.record',
  'delivery.record',
  'management.org.read',
  'commercial.exception.authorize',
  'coordination.decision.record',
  'production.entry.member',
  'production.review.member',
] as const;

export type SessionCapabilityScope = (typeof SESSION_CAPABILITY_SCOPES)[number];

export type MemberCapabilitySnapshot = {
  organizationId: string;
  memberId: string;
  accessStatus: string;
  grantedScopes: readonly string[];
};

export type CapabilityDecision = TrustedCapabilityDecision;

export type DecideCapabilityInput = {
  organizationId?: string | null;
  memberId?: string | null;
  accessStatus?: string | null;
  employmentStatus?: string | null;
  grantedScopes?: readonly string[] | null;
  requiredScope?: string | null;
  resourceOrganizationId?: string | null;
};

export type { TrustedMemberContext };

type AuthenticatedSessionIdentity = {
  memberId: string;
  organizationId: string;
  accessStatus: string;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Same rule as the shared context. Cargo and title are not part of the input.
 * A matching scope string does not survive a wrong tenant or a closed lifecycle.
 */
export function decideCapability(input: DecideCapabilityInput): CapabilityDecision {
  return decideStoredGrant(input);
}

function roleKeysFromMemberRead(member: unknown): readonly string[] | null {
  if (!member || typeof member !== 'object') return null;
  const summary = (member as { summary?: unknown }).summary;
  if (!summary || typeof summary !== 'object') return null;
  const roleKeys = (summary as { roleKeys?: unknown }).roleKeys;
  if (!Array.isArray(roleKeys)) return null;
  const scopes: string[] = [];
  for (const key of roleKeys) {
    const scope = text(key);
    if (scope && !scopes.includes(scope)) scopes.push(scope);
  }
  return scopes;
}

/**
 * Fail-closed view of a member read. Not the grant source. The loader uses
 * acceptTrustedMemberContext. A closed lifecycle returns null instead of
 * exposing stored role keys. Cargo, title, and a grantedScopes field are ignored.
 */
export function trustedMemberCapabilitySnapshot(
  session: AuthenticatedSessionIdentity,
  member: unknown,
): MemberCapabilitySnapshot | null {
  const memberId = text(session.memberId);
  const organizationId = text(session.organizationId);
  if (!memberId || !organizationId || !member || typeof member !== 'object') return null;

  const body = member as {
    member?: { id?: unknown; organizationId?: unknown; accessStatus?: unknown };
    summary?: { memberId?: unknown; organizationId?: unknown; accessStatus?: unknown };
    organizationId?: unknown;
  };

  const bodyMemberId = text(body.summary?.memberId) || text(body.member?.id);
  if (bodyMemberId && bodyMemberId !== memberId) return null;

  const bodyOrganizationId =
    text(body.summary?.organizationId) ||
    text(body.member?.organizationId) ||
    text(body.organizationId);
  if (bodyOrganizationId && bodyOrganizationId !== organizationId) return null;

  const summaryStatus = text(body.summary?.accessStatus);
  const memberStatus = text(body.member?.accessStatus);
  if (summaryStatus && memberStatus && summaryStatus !== memberStatus) return null;
  const accessStatus = summaryStatus || memberStatus;
  if (!accessStatus) return null;

  const summaryEmployment = text(
    (body.summary as { employmentStatus?: unknown } | undefined)?.employmentStatus,
  );
  const memberEmployment = text(
    (body.member as { employmentStatus?: unknown } | undefined)?.employmentStatus,
  );
  if (summaryEmployment && memberEmployment && summaryEmployment !== memberEmployment) return null;
  const employmentStatus = summaryEmployment || memberEmployment;
  if (lifecycleDenial({ accessStatus, employmentStatus })) return null;

  const grantedScopes = roleKeysFromMemberRead(member);
  if (!grantedScopes) return null;

  return { organizationId, memberId, accessStatus, grantedScopes };
}

/**
 * Loads the one trusted context from os-api. Arguments are ignored.
 * A scope list, member id, or tenant passed by the caller is not a grant.
 * A null result is denial, not an empty allow.
 */
export async function loadMemberCapabilities(
  ...callerSupplied: readonly unknown[]
): Promise<TrustedMemberContext | null> {
  void callerSupplied;
  try {
    const { getServerOsAuthContext } = await import('./actions');
    const { createOsApiClient } = await import('../api/os-api-client');
    const auth = await getServerOsAuthContext();
    if (!auth) return null;
    const client = createOsApiClient(auth);
    const payload = await client.getTrustedAuthorization();
    return acceptTrustedMemberContext(payload);
  } catch {
    return null;
  }
}
