import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import {
  bucketCompromisosDesk,
  isCommitmentDueSoon,
  isTeamCommitment,
} from './desk-buckets';

function row(overrides: Partial<CommitmentSummary> = {}): CommitmentSummary {
  return {
    id: 'c-1',
    organizationId: 'org',
    partyId: 'party-1',
    ownerMemberId: 'm-1',
    text: 'Demo commitment',
    dueAt: null,
    origin: 'employee_entered',
    relatedSubjectType: null,
    relatedSubjectId: null,
    lifecycle: 'open',
    state: 'pending',
    createdByMemberId: 'm-1',
    createdAt: '2026-09-01T00:00:00.000Z',
    fulfilledAt: null,
    fulfilledByMemberId: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe('compromisos desk buckets', () => {
  const asOf = new Date('2026-09-16T18:00:00.000Z');

  it('flags due soon / overdue / due today', () => {
    assert.equal(
      isCommitmentDueSoon(row({ dueAt: '2026-09-18T12:00:00.000Z' }), asOf),
      true,
    );
    assert.equal(isCommitmentDueSoon(row({ state: 'overdue' }), asOf), true);
    assert.equal(
      isCommitmentDueSoon(row({ dueAt: '2026-10-20T12:00:00.000Z' }), asOf),
      false,
    );
  });

  it('treats missing party as team', () => {
    assert.equal(isTeamCommitment(row({ partyId: null })), true);
    assert.equal(isTeamCommitment(row({ partyId: 'p-1' })), false);
  });

  it('buckets open due-soon, team, and completed', () => {
    const buckets = bucketCompromisosDesk(
      [
        row({ id: 'soon', dueAt: '2026-09-17T12:00:00.000Z' }),
        row({ id: 'team', partyId: null, dueAt: '2026-09-17T12:00:00.000Z' }),
        row({
          id: 'done',
          lifecycle: 'fulfilled',
          state: 'fulfilled',
          fulfilledAt: '2026-09-10T12:00:00.000Z',
        }),
        row({ id: 'far', dueAt: '2026-11-01T12:00:00.000Z' }),
      ],
      asOf,
    );
    assert.equal(buckets.dueSoon.length, 2);
    assert.equal(buckets.team.length, 1);
    assert.equal(buckets.completed.length, 1);
    assert.equal(buckets.openAll.length, 3);
  });
});
