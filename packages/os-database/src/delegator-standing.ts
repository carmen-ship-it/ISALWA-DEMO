import type { DelegatorStanding } from '@isalwa/os-domain';

/**
 * Read with every delegation used for authorization, so the delegator's current
 * access status and own role assignments decide what the delegation still confers
 * (computeEffectiveScopes / delegationConfersScope).
 */
export const DELEGATOR_STANDING_INCLUDE = {
  delegator: {
    select: {
      organizationId: true,
      accessStatus: true,
      roleAssignments: { select: { organizationId: true, roleKey: true, effectiveAt: true, endedAt: true } },
    },
  },
} as const;

type DelegatorRow = {
  organizationId: string;
  accessStatus: string;
  roleAssignments: { organizationId: string; roleKey: string; effectiveAt: Date; endedAt: Date | null }[];
};

export function toDelegatorStanding(delegator: DelegatorRow): DelegatorStanding {
  return {
    organizationId: delegator.organizationId,
    accessStatus: delegator.accessStatus,
    roleAssignments: delegator.roleAssignments
      .filter((r) => r.organizationId === delegator.organizationId)
      .map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
  };
}
