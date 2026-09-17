import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RequestContext } from '@isalwa/os-contracts';
import type { OsWorkStore } from './os-work-store';
import { WorkCommandService } from './work-command-service';

const ORG = 'org-session';
const ACTOR = 'actor-session';
const APPROVER = 'approver-other';

function ctx(): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId: ACTOR,
    personId: 'person',
    authIdentityId: 'auth',
    correlationId: 'corr',
    effectiveAt: new Date('2026-08-01T12:00:00.000Z'),
  };
}

describe('work auth queries', () => {
  it('passes the session organization into role and delegation reads', async () => {
    const calls: Array<{ method: string; organizationId?: string }> = [];
    const store = {
      async getMemberInOrg(organizationId: string, memberId: string) {
        return organizationId === ORG && memberId === ACTOR
          ? { id: ACTOR, organizationId: ORG, accessStatus: 'active' }
          : null;
      },
      async listRoleAssignmentsForMember(_memberId: string, organizationId?: string) {
        calls.push({ method: 'roles', organizationId });
        return [];
      },
      async listDelegationsForDelegate(_memberId: string, organizationId?: string) {
        calls.push({ method: 'delegations', organizationId });
        return [];
      },
      async findIdempotency() {
        return null;
      },
      async runInTransaction(fn: (next: OsWorkStore) => Promise<unknown>) {
        return fn(store as unknown as OsWorkStore);
      },
    };
    await assert.rejects(
      new WorkCommandService(store as unknown as OsWorkStore).execute('ReassignWork', ctx(), {
        workItemId: 'work-1',
        ownerMemberId: APPROVER,
      }),
      /PERMISSION_DENIED/,
    );
    assert.deepEqual(calls, [
      { method: 'roles', organizationId: ORG },
      { method: 'delegations', organizationId: ORG },
    ]);
  });

  it('does not treat a foreign delegation as approval authority and emits no success', async () => {
    const calls: Array<{ organizationId?: string }> = [];
    let decided = false;
    const store = {
      async getMemberInOrg(organizationId: string, memberId: string) {
        return organizationId === ORG && memberId === ACTOR
          ? { id: ACTOR, organizationId: ORG, accessStatus: 'active' }
          : null;
      },
      async listRoleAssignmentsForMember(_memberId: string, organizationId?: string) {
        calls.push({ organizationId });
        return [];
      },
      async listDelegationsForDelegate(_memberId: string, organizationId?: string) {
        calls.push({ organizationId });
        if (!organizationId) {
          return [
            {
              delegatorMemberId: APPROVER,
              scopes: ['approval.act'],
              startsAt: new Date('2020-01-01T00:00:00.000Z'),
              expiresAt: new Date('2027-01-01T00:00:00.000Z'),
              revokedAt: null,
            },
          ];
        }
        return [];
      },
      async findIdempotency() {
        return null;
      },
      async getApprovalRequest(organizationId: string, approvalRequestId: string) {
        if (organizationId !== ORG || approvalRequestId !== 'approval-1') return null;
        return {
          id: 'approval-1',
          organizationId: ORG,
          workItemId: null,
          subjectType: 'work_item',
          subjectId: 'work-1',
          requestedByMemberId: 'requester',
          approverMemberId: APPROVER,
          status: 'pending',
          contextSnapshotJson: {},
          decisionByMemberId: null,
          decisionReason: null,
          decidedAt: null,
        };
      },
      async decidePendingApprovalRequest() {
        decided = true;
        throw new Error('SHOULD_NOT_DECIDE');
      },
      async reassignPendingApprover() {
        throw new Error('SHOULD_NOT_ESCALATE');
      },
      async runInTransaction(fn: (next: OsWorkStore) => Promise<unknown>) {
        return fn(store as unknown as OsWorkStore);
      },
    };
    await assert.rejects(
      new WorkCommandService(store as unknown as OsWorkStore).execute('Approve', ctx(), {
        approvalRequestId: 'approval-1',
      }),
      /PERMISSION_DENIED/,
    );
    assert.equal(decided, false);
    assert.equal(calls.every((call) => call.organizationId === ORG), true);
  });
});
