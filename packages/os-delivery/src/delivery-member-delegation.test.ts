import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMER_DELIVERY_RECORD_SCOPE, WAREHOUSE_EXIT_RECORD_SCOPE } from '@isalwa/os-contracts';
import { createPrismaDeliveryStore, type DeliveryPrismaPort } from './prisma-store';

/**
 * R2 follow-up (21:33 §1): delivery's permission lookup uses the canonical
 * current-authority rule. Direct grants still work; delivery scopes stay
 * non-delegable; delegated scopes need an active delegator who still holds them.
 */
const ORG = 'org-del';
const PAST = new Date('2020-01-01T00:00:00.000Z');
const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000);

type Role = { organizationId: string; memberId: string; roleKey: string; effectiveAt: Date; endedAt: Date | null };
type Delegation = {
  scopes: string[];
  revokedAt?: Date | null;
  delegatorStatus?: string;
  delegatorRoleKeys?: string[];
};

function port(roles: Role[], delegations: Delegation[]): DeliveryPrismaPort {
  const unused = () => {
    throw new Error('not used');
  };
  return {
    osOrganizationMember: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        where.id === 'm1' && where.organizationId === ORG ? { id: 'm1', organizationId: ORG, accessStatus: 'active' } : null,
    },
    osRoleAssignment: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        roles.filter((r) => r.memberId === where.memberId && r.organizationId === where.organizationId),
    },
    osDelegation: {
      findMany: async () =>
        delegations.map((d) => ({
          scopesJson: d.scopes,
          startsAt: PAST,
          expiresAt: FUTURE,
          revokedAt: d.revokedAt ?? null,
          delegatorMemberId: 'boss',
          delegator: {
            organizationId: ORG,
            accessStatus: d.delegatorStatus ?? 'active',
            roleAssignments: (d.delegatorRoleKeys ?? d.scopes).map((roleKey) => ({
              organizationId: ORG,
              roleKey,
              effectiveAt: PAST,
              endedAt: null,
            })),
          },
        })),
    },
    osOrder: { findFirst: unused },
    osDelivery: { findFirst: unused, findMany: unused, create: unused },
    osDeliveryNote: { findFirst: unused, findMany: unused, create: unused },
  } as unknown as DeliveryPrismaPort;
}

async function scopesOf(roles: Role[], delegations: Delegation[]): Promise<string[]> {
  const member = await createPrismaDeliveryStore(port(roles, delegations)).getMemberInOrg(ORG, 'm1');
  return [...(member?.grantedScopes ?? [])].sort();
}

const direct = (roleKey: string, endedAt: Date | null = null): Role => ({
  organizationId: ORG,
  memberId: 'm1',
  roleKey,
  effectiveAt: PAST,
  endedAt,
});

describe('Delivery permission lookup follows the canonical delegation rule', () => {
  it('direct valid grants still work', async () => {
    assert.deepEqual(
      await scopesOf([direct(WAREHOUSE_EXIT_RECORD_SCOPE), direct(CUSTOMER_DELIVERY_RECORD_SCOPE)], []),
      [CUSTOMER_DELIVERY_RECORD_SCOPE, WAREHOUSE_EXIT_RECORD_SCOPE].sort(),
    );
  });

  it('an ended direct grant confers nothing', async () => {
    assert.deepEqual(await scopesOf([direct(WAREHOUSE_EXIT_RECORD_SCOPE, PAST)], []), []);
  });

  it('delivery scopes stay non-delegable, even from an active holder', async () => {
    assert.deepEqual(await scopesOf([], [{ scopes: [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE] }]), []);
  });

  it('a delegable scope from an active holder is conferred', async () => {
    assert.deepEqual(await scopesOf([], [{ scopes: ['people.admin'] }]), ['people.admin']);
  });

  it('revoked, suspended-delegator and no-longer-held delegations confer nothing', async () => {
    assert.deepEqual(await scopesOf([], [{ scopes: ['people.admin'], revokedAt: PAST }]), []);
    assert.deepEqual(await scopesOf([], [{ scopes: ['people.admin'], delegatorStatus: 'suspended' }]), []);
    assert.deepEqual(await scopesOf([], [{ scopes: ['people.admin'], delegatorRoleKeys: [] }]), []);
  });
});
