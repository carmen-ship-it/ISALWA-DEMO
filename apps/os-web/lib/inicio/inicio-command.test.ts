import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { MANAGEMENT_ORG_READ_SCOPE } from '@/lib/management/scope';
import { COMMERCIAL_TEAM_READ_SCOPE } from '@isalwa/os-contracts';
import { resolveInicioRoleLens } from '@/lib/inicio/role-lens';
import {
  commitmentsQueryForLens,
  filterVisibleWorkItems,
  splitCommitmentQueues,
  workItemsQueryForLens,
} from '@/lib/inicio/queues';

function work(partial: Partial<WorkSummaryReadModel> & { workItemId: string }): WorkSummaryReadModel {
  return {
    organizationId: 'org-1',
    ownerMemberId: 'mem-1',
    createdByMemberId: 'mem-1',
    title: 'Seguimiento',
    description: '',
    status: 'open',
    dueAt: null,
    subjectType: null,
    subjectId: null,
    approvalStatus: 'none',
    priority: 'normal',
    completedAt: null,
    cancelledAt: null,
    pendingApprovalId: null,
    ownershipChangeCount: 0,
    lastOwnershipChangeAt: null,
    ...partial,
  };
}

function commitment(partial: Partial<CommitmentSummary> & { id: string }): CommitmentSummary {
  return {
    id: partial.id,
    organizationId: 'org-1',
    partyId: partial.partyId ?? 'pty-1',
    ownerMemberId: 'mem-1',
    text: partial.text ?? 'Llamar al cliente',
    dueAt: partial.dueAt ?? '2026-09-10T12:00:00.000Z',
    origin: 'manual',
    relatedSubjectType: null,
    relatedSubjectId: null,
    lifecycle: 'open',
    state: partial.state ?? 'pending',
    createdByMemberId: 'mem-1',
    createdAt: '2026-09-01T12:00:00.000Z',
    fulfilledAt: null,
    fulfilledByMemberId: null,
    cancelledAt: null,
  };
}

describe('inicio role lens', () => {
  it('prefers owner, then manager, then operator', () => {
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [MANAGEMENT_ORG_READ_SCOPE],
        leadershipTeamReady: false,
        leadershipOrgReady: false,
      }),
      'owner',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [COMMERCIAL_TEAM_READ_SCOPE],
        leadershipTeamReady: false,
        leadershipOrgReady: false,
      }),
      'manager',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [],
        leadershipTeamReady: true,
        leadershipOrgReady: false,
      }),
      'manager',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [],
        leadershipTeamReady: false,
        leadershipOrgReady: true,
      }),
      'owner',
    );
    assert.equal(
      resolveInicioRoleLens({
        roleKeys: [],
        leadershipTeamReady: false,
        leadershipOrgReady: false,
      }),
      'operator',
    );
  });
});

describe('inicio command queue queries', () => {
  it('maps lens to work visibility without inventing filters', () => {
    assert.deepEqual(workItemsQueryForLens('operator'), { status: 'open', limit: 8 });
    assert.deepEqual(workItemsQueryForLens('manager'), {
      status: 'open',
      limit: 8,
      visibility: 'team',
    });
    assert.deepEqual(workItemsQueryForLens('owner'), {
      status: 'open',
      limit: 8,
      visibility: 'org',
    });
    assert.deepEqual(commitmentsQueryForLens('operator', 'mem-9'), {
      lifecycle: 'open',
      ownerMemberId: 'mem-9',
    });
    assert.deepEqual(commitmentsQueryForLens('manager', 'mem-9'), { lifecycle: 'open' });
  });

  it('orders overdue work before upcoming open items', () => {
    const asOf = new Date('2026-09-16T12:00:00.000Z');
    const rows = filterVisibleWorkItems(
      [
        work({ workItemId: 'w-later', dueAt: '2026-09-20T12:00:00.000Z' }),
        work({ workItemId: 'w-over', dueAt: '2026-09-10T12:00:00.000Z' }),
      ],
      asOf,
    );
    assert.deepEqual(rows.map((row) => row.workItemId), ['w-over', 'w-later']);
  });

  it('splits overdue commitments for the compromisos section', () => {
    const split = splitCommitmentQueues([
      commitment({ id: 'c-open', state: 'pending' }),
      commitment({ id: 'c-late', state: 'overdue' }),
    ]);
    assert.deepEqual(
      split.overdue.map((row) => row.id),
      ['c-late'],
    );
    assert.deepEqual(
      split.open.map((row) => row.id),
      ['c-open'],
    );
  });
});
