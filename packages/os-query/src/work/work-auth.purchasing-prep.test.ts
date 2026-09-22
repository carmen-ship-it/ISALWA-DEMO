import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PURCHASING_OPERATIONAL_RECORD_SCOPE } from '@isalwa/os-contracts';
import { canViewWork, isOpenPurchasingPrepReview } from './work-auth';
import type { QueryContext } from '../query-context';
import type { StoredWorkReadModel } from '../projection-store-port';

function ctx(scopes: string[], memberId = 'm-compras'): QueryContext {
  return {
    organizationId: 'org-1',
    actorMemberId: memberId,
    effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    auth: {
      memberId,
      organizationId: 'org-1',
      accessStatus: 'active',
      roleKeys: scopes,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  } as QueryContext;
}

function work(partial: Partial<StoredWorkReadModel>): StoredWorkReadModel {
  return {
    workItemId: 'w1',
    organizationId: 'org-1',
    title: 'Revisión de abastecimiento · O-000008',
    description: 'Contexto\n[[order-prep:purchasing:01ORDER]]',
    status: 'open',
    ownerMemberId: 'm-asesor',
    createdByMemberId: 'm-asesor',
    subjectType: 'party',
    subjectId: 'party-1',
    priority: 'normal',
    dueAt: null,
    completedAt: null,
    cancelledAt: null,
    ownershipChangeCount: 0,
    lastEventId: 'e1',
    lastOccurredAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as StoredWorkReadModel;
}

describe('purchasing prep work visibility', () => {
  it('detects open purchasing prep markers', () => {
    assert.equal(isOpenPurchasingPrepReview(work({})), true);
    assert.equal(isOpenPurchasingPrepReview(work({ status: 'done' })), false);
    assert.equal(
      isOpenPurchasingPrepReview(work({ description: '[[order-prep:warehouse:01ORDER]]' })),
      false,
    );
  });

  it('lets purchasing operators view requester-owned open prep reviews', () => {
    assert.equal(canViewWork(ctx([PURCHASING_OPERATIONAL_RECORD_SCOPE]), work({})), true);
  });

  it('denies unrelated operators', () => {
    assert.equal(canViewWork(ctx(['commercial.team.read']), work({})), false);
  });
});
