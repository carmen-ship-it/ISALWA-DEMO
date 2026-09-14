import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import { buildQueryContext, type WorkforceAuthReader } from './query-context';

const SESSION_ORG = 'org-session';
const FOREIGN_ORG = 'org-foreign';
const CLIENT_ORG = 'org-client-must-not-be-used';
const MEMBER_ID = 'member-shared';
const AS_OF = new Date('2026-09-14T12:00:00.000Z');

function matchesOrg(rowOrg: string, organizationId?: string): boolean {
  return organizationId ? rowOrg === organizationId : true;
}

function session(): RequestContext {
  return {
    organizationId: SESSION_ORG,
    actorMemberId: MEMBER_ID,
    personId: 'person-session',
    authIdentityId: 'auth-session',
    correlationId: 'corr-session',
    effectiveAt: AS_OF,
  };
}

/**
 * Applies organizationId in the query, the way Prisma where must.
 * Omitting it returns every row for the member, including the foreign organization.
 */
function reader() {
  const calls: Array<{ method: string; memberId: string; organizationId?: string }> = [];
  const workforce: WorkforceAuthReader = {
    async getMemberInOrg(organizationId, memberId) {
      if (organizationId !== SESSION_ORG || memberId !== MEMBER_ID) return null;
      return {
        id: memberId,
        organizationId,
        personId: 'person-session',
        accessStatus: 'active',
      };
    },
    async listRoleAssignmentsForMember(memberId, organizationId) {
      calls.push({ method: 'listRoleAssignmentsForMember', memberId, organizationId });
      if (memberId !== MEMBER_ID) return [];
      return [
        {
          organizationId: SESSION_ORG,
          roleKey: 'sales_rep',
          effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
          endedAt: null,
        },
        {
          organizationId: FOREIGN_ORG,
          roleKey: 'foreign_admin',
          effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
          endedAt: null,
        },
      ]
        .filter((row) => matchesOrg(row.organizationId, organizationId))
        .map(({ roleKey, effectiveAt, endedAt }) => ({ roleKey, effectiveAt, endedAt }));
    },
    async listDelegationsForDelegate(memberId, organizationId) {
      calls.push({ method: 'listDelegationsForDelegate', memberId, organizationId });
      if (memberId !== MEMBER_ID) return [];
      return [
        {
          organizationId: SESSION_ORG,
          scopes: ['approval.act'],
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
          revokedAt: null,
          delegatorMemberId: 'delegator-session',
        },
        {
          organizationId: FOREIGN_ORG,
          scopes: ['approval.act'],
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
          revokedAt: null,
          delegatorMemberId: 'delegator-foreign',
        },
      ]
        .filter((row) => matchesOrg(row.organizationId, organizationId))
        .map(({ scopes, startsAt, expiresAt, revokedAt, delegatorMemberId }) => ({
          scopes,
          startsAt,
          expiresAt,
          revokedAt,
          delegatorMemberId,
        }));
    },
  };
  return { workforce, calls };
}

describe('query context session organization', () => {
  it('omits a role row for the same member in another organization when the session org is passed', async () => {
    const { workforce, calls } = reader();
    const ctx = await buildQueryContext(session(), workforce);

    assert.deepEqual(
      calls.filter((call) => call.method === 'listRoleAssignmentsForMember'),
      [{ method: 'listRoleAssignmentsForMember', memberId: MEMBER_ID, organizationId: SESSION_ORG }],
    );
    assert.deepEqual(
      calls.filter((call) => call.method === 'listDelegationsForDelegate'),
      [{ method: 'listDelegationsForDelegate', memberId: MEMBER_ID, organizationId: SESSION_ORG }],
    );
    assert.equal(
      calls.some((call) => call.organizationId === CLIENT_ORG || call.organizationId === FOREIGN_ORG),
      false,
    );
    assert.equal(ctx.auth.organizationId, SESSION_ORG);
    assert.equal(ctx.auth.roleKeys.includes('sales_rep'), true);
    assert.equal(ctx.auth.roleKeys.includes('foreign_admin'), false);
    assert.deepEqual(ctx.auth.delegatedApproverFor, ['delegator-session']);
  });
});
