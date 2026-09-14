import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildQueryContext, type WorkforceAuthReader } from './query-context';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';

function session() {
  return {
    organizationId: SESSION,
    actorMemberId: 'member-alpha',
    personId: 'person-alpha',
    authIdentityId: 'auth-alpha',
    correlationId: 'corr-alpha',
    effectiveAt: new Date('2026-06-01T00:00:00.000Z'),
  };
}

function reader(opts?: { includeUntagged?: boolean }): WorkforceAuthReader {
  return {
    async getMemberInOrg(organizationId, memberId) {
      if (organizationId !== SESSION || memberId !== 'member-alpha') return null;
      return {
        id: memberId,
        organizationId,
        personId: 'person-alpha',
        accessStatus: 'active',
      };
    },
    async listRoleAssignmentsForMember() {
      return [
        {
          roleKey: 'commercial.team.read',
          effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
          endedAt: null,
          organizationId: SESSION,
        },
        {
          roleKey: 'management.org.read',
          effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
          endedAt: null,
          organizationId: OTHER,
        },
        ...(opts?.includeUntagged
          ? [
              {
                roleKey: 'people.admin',
                effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
                endedAt: null,
              },
            ]
          : []),
      ];
    },
    async listDelegationsForDelegate() {
      return [
        {
          scopes: ['approval.act'],
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
          revokedAt: null,
          delegatorMemberId: 'delegator-alpha',
          organizationId: SESSION,
        },
        {
          scopes: ['approval.act'],
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
          revokedAt: null,
          delegatorMemberId: 'delegator-zeta',
          organizationId: OTHER,
        },
      ];
    },
  };
}

describe('buildQueryContext tenant scope', () => {
  it('buildQueryContext same-tenant role and delegation are allowed', async () => {
    const ctx = await buildQueryContext(session(), reader());
    assert.equal(ctx.auth.organizationId, SESSION);
    assert.equal(ctx.auth.roleKeys.includes('commercial.team.read'), true);
    assert.equal(ctx.auth.delegatedApproverFor.includes('delegator-alpha'), true);
  });

  it('buildQueryContext cross-tenant role and delegation ids are excluded', async () => {
    const ctx = await buildQueryContext(session(), reader());
    assert.equal(ctx.auth.roleKeys.includes('management.org.read'), false);
    assert.equal(ctx.auth.delegatedApproverFor.includes('delegator-zeta'), false);
    assert.equal(JSON.stringify(ctx).includes(OTHER), false);
    assert.equal(JSON.stringify(ctx).includes('zeta'), false);
  });

  it('buildQueryContext drops role rows with no organization predicate', async () => {
    const ctx = await buildQueryContext(session(), reader({ includeUntagged: true }));
    assert.equal(ctx.auth.roleKeys.includes('people.admin'), false);
    assert.equal(ctx.auth.roleKeys.includes('commercial.team.read'), true);
  });

  it('buildQueryContext missing member in the session tenant is denied', async () => {
    await assert.rejects(
      () =>
        buildQueryContext(
          { ...session(), actorMemberId: 'member-zeta' },
          reader(),
        ),
      (error: Error) => error.message === 'AUTH_REQUIRED',
    );
  });
});
