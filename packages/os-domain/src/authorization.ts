import { isDelegableScope, isRecognizedPermissionScope, type AdminScopeKey } from '@isalwa/os-contracts';

export type EffectiveRoleAssignment = {
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

/**
 * The delegator as they stand now, read with the delegation. A delegation passes on
 * only what its delegator could still do: without this standing it confers nothing.
 */
export type DelegatorStanding = {
  organizationId: string;
  accessStatus: string;
  roleAssignments: EffectiveRoleAssignment[];
};

export type EffectiveDelegation = {
  scopes: string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  delegatorMemberId: string;
  organizationId?: string;
  delegator?: DelegatorStanding;
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
    // A job title or an unknown string is stored as a label. It is not a grant.
    if (isAssignmentActive(r.effectiveAt, r.endedAt, asOf) && isRecognizedPermissionScope(r.roleKey)) {
      scopes.add(r.roleKey);
    }
  }
  for (const d of delegations) {
    for (const s of d.scopes) {
      if (delegationConfersScope(d, s, asOf)) scopes.add(s);
    }
  }
  return [...scopes];
}

/**
 * F10: a delegation confers a scope only while it is within its window and not
 * revoked, the delegator is an active member of the delegation's organization, and
 * the delegator independently holds that scope by their own role assignment at
 * asOf. Evaluated at use time, so suspension or loss of the scope stops it at once;
 * the delegation row itself is never rewritten.
 */
export function delegationConfersScope(d: EffectiveDelegation, scope: string, asOf: Date): boolean {
  if (d.revokedAt) return false;
  if (d.startsAt > asOf || d.expiresAt <= asOf) return false;
  if (!isDelegableScope(scope) || !d.scopes.includes(scope)) return false;
  const delegator = d.delegator;
  if (!delegator || delegator.accessStatus !== 'active') return false;
  if (d.organizationId && delegator.organizationId !== d.organizationId) return false;
  return delegator.roleAssignments.some(
    (r) => r.roleKey === scope && isAssignmentActive(r.effectiveAt, r.endedAt, asOf),
  );
}

export function memberHasScope(snapshot: MemberAccessSnapshot, scope: AdminScopeKey): boolean {
  if (snapshot.accessStatus !== 'active') return false;
  return snapshot.roleKeys.includes(scope) || snapshot.delegatedScopes.includes(scope);
}

/** Any explicitly granted role or delegation scope. Does not elevate inactive members. */
export function memberHasGrantedScope(snapshot: MemberAccessSnapshot, scope: string): boolean {
  if (snapshot.accessStatus !== 'active') return false;
  const key = scope.trim();
  if (!key) return false;
  return snapshot.roleKeys.includes(key) || snapshot.delegatedScopes.includes(key);
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
