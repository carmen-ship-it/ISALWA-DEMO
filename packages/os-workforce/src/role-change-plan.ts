import { isAdditionalAssignableScope } from '@isalwa/os-contracts';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import type { RoleAssignmentRecord } from './store-types';

/**
 * What ChangeRole will do, computed once for both the confirmation preview and
 * the command. The primary role is every open assignment whose key is not an
 * additional-assignable scope; additional permissions (GrantAdditionalRole)
 * survive unless the request names them for revocation. The new role must be a
 * primary role: an additional-assignable scope becomes persistent only through
 * an explicit GrantAdditionalRole, never as a side effect of a role change.
 */
export type RoleChangePlan = {
  memberId: string;
  newPrimaryRoleKey: string;
  endedPrimaryRoleKeys: string[];
  preservedAdditionalRoleKeys: string[];
  revokedAdditionalRoleKeys: string[];
  effectiveScopesBefore: string[];
  effectiveScopesAfter: string[];
  scopesGained: string[];
  scopesLost: string[];
};

function unique(keys: readonly string[]): string[] {
  return [...new Set(keys)].sort();
}

export function parseRevokeAdditionalRoleKeys(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.some((key) => typeof key !== 'string' || !key.trim())) {
    throw new Error('VALIDATION_FAILED');
  }
  return unique(raw.map((key: string) => key.trim()));
}

export function planRoleChange(input: {
  memberId: string;
  assignments: readonly RoleAssignmentRecord[];
  roleKey: string;
  revokeAdditionalRoleKeys: readonly string[];
  asOf: Date;
}): RoleChangePlan {
  if (isAdditionalAssignableScope(input.roleKey)) throw new Error('VALIDATION_FAILED');
  const open = input.assignments.filter((row) => row.memberId === input.memberId && row.endedAt === null);
  const openPrimary = unique(open.filter((row) => !isAdditionalAssignableScope(row.roleKey)).map((row) => row.roleKey));
  const openAdditional = unique(open.filter((row) => isAdditionalAssignableScope(row.roleKey)).map((row) => row.roleKey));
  for (const key of input.revokeAdditionalRoleKeys) {
    if (!openAdditional.includes(key) || key === input.roleKey) throw new Error('VALIDATION_FAILED');
  }
  const revoked = unique(input.revokeAdditionalRoleKeys);
  const preserved = openAdditional.filter((key) => !revoked.includes(key) && key !== input.roleKey);

  const before = unique(computeEffectiveScopes(input.assignments.filter((row) => row.memberId === input.memberId), [], input.asOf));
  const after = unique(
    computeEffectiveScopes(
      [input.roleKey, ...preserved].map((roleKey) => ({ roleKey, effectiveAt: input.asOf, endedAt: null })),
      [],
      input.asOf,
    ),
  );
  return {
    memberId: input.memberId,
    newPrimaryRoleKey: input.roleKey,
    endedPrimaryRoleKeys: openPrimary,
    preservedAdditionalRoleKeys: preserved,
    revokedAdditionalRoleKeys: revoked,
    effectiveScopesBefore: before,
    effectiveScopesAfter: after,
    scopesGained: after.filter((key) => !before.includes(key)),
    scopesLost: before.filter((key) => !after.includes(key)),
  };
}
