/**
 * Server session scopes. Extends the existing path. Does not replace it.
 *
 * Supabase cookie or dev session
 *   → getServerOsAuthContext (apps/os-web/lib/auth/actions.ts)
 *   → os-api resolveSession (JWT → AuthIdentity → Member, or validated dev headers)
 *   → GET /session/me for memberId / organizationId
 *   → GET /members/:memberId summary.roleKeys (active role assignments only)
 *   → this snapshot
 *   → decideCapability
 *
 * GET /capabilities is the capability registry, not a member grant list.
 * Role keys are not written to a cookie, localStorage, or any client claim.
 * Cargo and job title are not inputs. A held scope never implies another scope.
 * Delegated scopes are not on the member summary. This loader does not invent them.
 */

import { scopeImplies } from '@isalwa/os-contracts';

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

export type CapabilityDecision =
  | 'allow'
  | 'AUTH_REQUIRED'
  | 'ROLE_FORBIDDEN'
  | 'TENANT_FORBIDDEN'
  | 'MEMBER_INACTIVE';

export type DecideCapabilityInput = {
  organizationId?: string | null;
  memberId?: string | null;
  accessStatus?: string | null;
  grantedScopes?: readonly string[] | null;
  requiredScope?: string | null;
  resourceOrganizationId?: string | null;
};

type AuthenticatedSessionIdentity = {
  memberId: string;
  organizationId: string;
  accessStatus: string;
};

type MemberAuthorizationClient = {
  getAuthenticatedSession(): Promise<AuthenticatedSessionIdentity>;
  getMember(memberId: string): Promise<unknown>;
};

const ACTIVE_ACCESS = 'active';
const INVITED_ACCESS = 'invited';

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Lifecycle follows ACCESS_STATUSES and assertMemberActive:
 * invited is not yet a member who can act; suspended and revoked cannot act;
 * any other non-active status is denied. Only 'active' can hold a scope.
 */
function lifecycleDecision(accessStatus: string): CapabilityDecision | null {
  if (accessStatus === INVITED_ACCESS) return 'AUTH_REQUIRED';
  if (accessStatus !== ACTIVE_ACCESS) return 'MEMBER_INACTIVE';
  return null;
}

/**
 * Pure deny helper. Does not fetch. Caller-supplied cargo, title, and extra
 * fields are ignored because they are not part of the decision.
 * A matching scope string does not survive a wrong tenant or a non-active member.
 */
export function decideCapability(input: DecideCapabilityInput): CapabilityDecision {
  const organizationId = trimmed(input.organizationId);
  const memberId = trimmed(input.memberId);
  if (!organizationId || !memberId) return 'AUTH_REQUIRED';

  const lifecycle = lifecycleDecision(trimmed(input.accessStatus));
  if (lifecycle) return lifecycle;

  const resourceOrganizationId = trimmed(input.resourceOrganizationId);
  if (!resourceOrganizationId || resourceOrganizationId !== organizationId) {
    return 'TENANT_FORBIDDEN';
  }

  const requiredScope = trimmed(input.requiredScope);
  const granted = input.grantedScopes ?? [];
  const held = granted.some((scope) => typeof scope === 'string' && scopeImplies(scope, requiredScope));
  if (!requiredScope || !held) return 'ROLE_FORBIDDEN';

  return 'allow';
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
 * Projects an already authenticated API session and the member read it names.
 * Scopes come only from summary.roleKeys. A grantedScopes field, cargo, or
 * title on either object is ignored. A body that names a different member or
 * tenant is discarded.
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

  const grantedScopes = roleKeysFromMemberRead(member);
  if (!grantedScopes) return null;

  return { organizationId, memberId, accessStatus, grantedScopes };
}

/**
 * Loads the authenticated member's explicit role keys from os-api.
 * Arguments are ignored. A scope list, member id, or tenant passed by the
 * caller is not a grant. A null result is AUTH_REQUIRED, not an empty allow.
 * There is no browser claim to trust.
 */
export async function loadMemberCapabilities(
  ...callerSupplied: readonly unknown[]
): Promise<MemberCapabilitySnapshot | null> {
  void callerSupplied;
  try {
    const { getServerOsAuthContext } = await import('./actions');
    const { createOsApiClient } = await import('../api/os-api-client');
    const auth = await getServerOsAuthContext();
    if (!auth) return null;
    const client: MemberAuthorizationClient = createOsApiClient(auth);
    const session = await client.getAuthenticatedSession();
    const member = await client.getMember(session.memberId);
    return trustedMemberCapabilitySnapshot(session, member);
  } catch {
    return null;
  }
}
