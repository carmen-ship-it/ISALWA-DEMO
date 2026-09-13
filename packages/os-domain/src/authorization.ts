import type { AdminScopeKey } from '@isalwa/os-contracts';

export type EffectiveRoleAssignment = {
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type EffectiveDelegation = {
  scopes: string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  delegatorMemberId: string;
};

export type MemberAccessSnapshot = {
  memberId: string;
  organizationId: string;
  accessStatus: string;
  roleKeys: string[];
  delegatedScopes: string[];
};

export function isAssignmentActive(
  effectiveAt: Date,
  endedAt: Date | null,
  asOf: Date,
): boolean {
  return effectiveAt <= asOf && (endedAt === null || endedAt > asOf);
}

export function computeEffectiveScopes(
  roles: EffectiveRoleAssignment[],
  delegations: EffectiveDelegation[],
  asOf: Date,
): string[] {
  const scopes = new Set<string>();
  for (const r of roles) {
    if (isAssignmentActive(r.effectiveAt, r.endedAt, asOf)) {
      scopes.add(r.roleKey);
    }
  }
  for (const d of delegations) {
    if (d.revokedAt) continue;
    if (d.startsAt > asOf || d.expiresAt <= asOf) continue;
    for (const s of d.scopes) scopes.add(s);
  }
  return [...scopes];
}

export function memberHasScope(snapshot: MemberAccessSnapshot, scope: AdminScopeKey): boolean {
  if (snapshot.accessStatus !== 'active') return false;
  return snapshot.roleKeys.includes(scope) || snapshot.delegatedScopes.includes(scope);
}

export function assertMemberActive(snapshot: MemberAccessSnapshot): void {
  if (snapshot.accessStatus === 'revoked' || snapshot.accessStatus === 'suspended') {
    throw new Error('ACCESS_REVOKED');
  }
  if (snapshot.accessStatus === 'invited') {
    throw new Error('AUTH_REQUIRED');
  }
}

export function assertTenantMatch(sessionOrgId: string, resourceOrgId: string): void {
  if (sessionOrgId !== resourceOrgId) {
    throw new Error('TENANT_FORBIDDEN');
  }
}

/** AI inherits same scopes as member — no elevation. */
export function aiEffectiveScopes(snapshot: MemberAccessSnapshot): string[] {
  return [...new Set([...snapshot.roleKeys, ...snapshot.delegatedScopes])];
}
