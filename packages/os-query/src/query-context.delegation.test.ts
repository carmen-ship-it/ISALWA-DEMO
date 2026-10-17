import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { buildQueryContext, type WorkforceAuthReader } from './query-context';
import { canViewApproval } from './work/work-auth';
import type { StoredApprovalReadModel } from './projection-store-port';

/**
 * R2 follow-up (21:33 §1): approval read access by delegation uses the canonical
 * current-authority rule. A revoked or invalid delegation grants no read, even
 * though the decision command is already denied elsewhere.
 */
const ORG = 'org-q';
const AS_OF = new Date('2026-09-14T12:00:00.000Z');
const PAST = new Date('2026-01-01T00:00:00.000Z');
const FUTURE = new Date('2026-12-31T00:00:00.000Z');

type Delegation = { revokedAt?: Date | null; delegatorStatus?: string; delegatorHolds?: boolean; scopes?: string[] };

function session(): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId: 'delegate',
    personId: 'p',
    authIdentityId: 'a',
    correlationId: 'c',
    effectiveAt: AS_OF,
  };
}

function reader(directRoles: string[], delegations: Delegation[]): WorkforceAuthReader {
  return {
    async getMemberInOrg(organizationId, memberId) {
      return { id: memberId, organizationId, personId: 'p', accessStatus: 'active' };
    },
    async listRoleAssignmentsForMember() {
      return directRoles.map((roleKey) => ({ organizationId: ORG, roleKey, effectiveAt: PAST, endedAt: null }));
    },
    async listDelegationsForDelegate() {
      return delegations.map((d) => ({
        scopes: d.scopes ?? ['approval.act'],
        startsAt: PAST,
        expiresAt: FUTURE,
        revokedAt: d.revokedAt ?? null,
        delegatorMemberId: 'approver',
        organizationId: ORG,
        delegator: {
          organizationId: ORG,
          accessStatus: d.delegatorStatus ?? 'active',
          roleAssignments:
            d.delegatorHolds === false ? [] : [{ roleKey: 'approval.act', effectiveAt: PAST, endedAt: null }],
        },
      }));
    },
  } as WorkforceAuthReader;
}

const approval = {
  id: 'ap1',
  organizationId: ORG,
  approverMemberId: 'approver',
  requestedByMemberId: 'someone-else',
  status: 'pending',
} as unknown as StoredApprovalReadModel;

async function view(directRoles: string[], delegations: Delegation[]) {
  const ctx = await buildQueryContext(session(), reader(directRoles, delegations));
  return { approverFor: ctx.auth.delegatedApproverFor, canView: canViewApproval(ctx, approval), roleKeys: ctx.auth.roleKeys };
}

describe('Query approval delegation follows the canonical rule', () => {
  it('a valid delegation from an active approval.act holder grants approval read', async () => {
    assert.deepEqual(await view([], [{}]), { approverFor: ['approver'], canView: true, roleKeys: ['approval.act'] });
  });

  it('revoked delegation: no approval read', async () => {
    const r = await view([], [{ revokedAt: PAST }]);
    assert.deepEqual([r.approverFor, r.canView], [[], false]);
  });

  it('suspended delegator: no approval read', async () => {
    const r = await view([], [{ delegatorStatus: 'suspended' }]);
    assert.deepEqual([r.approverFor, r.canView], [[], false]);
  });

  it('delegator no longer holds approval.act: no approval read', async () => {
    const r = await view([], [{ delegatorHolds: false }]);
    assert.deepEqual([r.approverFor, r.canView], [[], false]);
  });

  it('people.admin alone does not read the approval (20:03 §4, F11)', async () => {
    const r = await view(['people.admin'], []);
    assert.deepEqual([r.approverFor, r.canView], [[], false]);
  });
});
