import type { RequestContext } from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  memberHasScope,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import type { AdminScopeKey } from '@isalwa/os-contracts';

export type QueryAuthSnapshot = MemberAccessSnapshot & {
  /** Approver member IDs this actor may act for via active `approval.act` delegation. */
  delegatedApproverFor: string[];
};

export type QueryContext = RequestContext & {
  auth: QueryAuthSnapshot;
};

export type WorkforceAuthReader = {
  getMemberInOrg(organizationId: string, memberId: string): Promise<{
    id: string;
    organizationId: string;
    personId: string;
    accessStatus: string;
  } | null>;
  listRoleAssignmentsForMember(memberId: string): Promise<
    Array<{ roleKey: string; effectiveAt: Date; endedAt: Date | null }>
  >;
  listDelegationsForDelegate(memberId: string): Promise<
    Array<{
      scopes: string[];
      startsAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
      delegatorMemberId: string;
    }>
  >;
};

export async function buildQueryContext(
  session: RequestContext,
  workforce: WorkforceAuthReader,
): Promise<QueryContext> {
  const member = await workforce.getMemberInOrg(session.organizationId, session.actorMemberId);
  if (!member) throw new Error('AUTH_REQUIRED');
  assertTenantMatch(session.organizationId, member.organizationId);

  const roles = await workforce.listRoleAssignmentsForMember(member.id);
  const delegations = await workforce.listDelegationsForDelegate(member.id);
  const roleKeys = computeEffectiveScopes(
    roles.map((r) => ({
      roleKey: r.roleKey,
      effectiveAt: r.effectiveAt,
      endedAt: r.endedAt,
    })),
    delegations.map((d) => ({
      scopes: d.scopes,
      startsAt: d.startsAt,
      expiresAt: d.expiresAt,
      revokedAt: d.revokedAt,
      delegatorMemberId: d.delegatorMemberId,
    })),
    session.effectiveAt,
  );

  const delegatedApproverFor = delegations
    .filter((d) => {
      if (d.revokedAt) return false;
      if (d.startsAt > session.effectiveAt || d.expiresAt <= session.effectiveAt) return false;
      return d.scopes.includes('approval.act');
    })
    .map((d) => d.delegatorMemberId);

  const auth: QueryAuthSnapshot = {
    memberId: member.id,
    organizationId: member.organizationId,
    accessStatus: member.accessStatus,
    roleKeys,
    delegatedScopes: [],
    delegatedApproverFor,
  };
  assertMemberActive(auth);

  return { ...session, auth };
}

export function assertQueryScope(
  ctx: QueryContext,
  required: AdminScopeKey | 'member_active',
): void {
  assertTenantMatch(ctx.organizationId, ctx.auth.organizationId);
  assertMemberActive(ctx.auth);
  if (required === 'member_active') return;
  if (!memberHasScope(ctx.auth, required)) {
    throw new Error('PERMISSION_DENIED');
  }
}

export function assertQueryTenantResource(
  ctx: QueryContext,
  resourceOrganizationId: string,
): void {
  assertTenantMatch(ctx.organizationId, resourceOrganizationId);
}
