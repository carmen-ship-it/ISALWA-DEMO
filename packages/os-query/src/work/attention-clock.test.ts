import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { ProjectionFreshness } from '@isalwa/os-contracts';
import type {
  StoredApprovalReadModel,
  StoredAttentionReadModel,
  StoredWorkReadModel,
} from '../projection-store-port';
import {
  deriveAttentionReadModels,
  isOpenWorkPastDue,
  organizationIdsNeedingOverdueRefresh,
  overdueAttentionKey,
} from './attention-derivation';
import { AttentionClock } from './attention-clock';

const NOW = new Date('2026-09-13T16:00:00.000Z');
const FUTURE = '2026-09-14T16:00:00.000Z';
const PAST = '2026-09-13T15:00:00.000Z';
const AFTER = new Date('2026-09-13T16:00:00.001Z');

function work(overrides: Partial<StoredWorkReadModel> & Pick<StoredWorkReadModel, 'workItemId' | 'organizationId' | 'ownerMemberId'>): StoredWorkReadModel {
  return {
    title: 'Follow up',
    description: null,
    status: 'open',
    priority: 'normal',
    createdByMemberId: overrides.ownerMemberId,
    subjectType: 'party',
    subjectId: 'party-1',
    dueAt: FUTURE,
    completedAt: null,
    cancelledAt: null,
    pendingApprovalId: null,
    approvalStatus: 'none',
    ownershipChangeCount: 0,
    lastOwnershipChangeAt: null,
    lastEventId: null,
    lastOccurredAt: null,
    lastReassignedAt: null,
    updatedAt: NOW,
    ...overrides,
  };
}

class MemoryAttentionStore {
  work = new Map<string, StoredWorkReadModel>();
  approvals: StoredApprovalReadModel[] = [];
  attention = new Map<string, StoredAttentionReadModel>();
  events: string[] = [];
  rebuilds: string[] = [];
  freshness: ProjectionFreshness[] = [];
  private rebuildGate: Promise<void> = Promise.resolve();

  add(item: StoredWorkReadModel): void {
    this.work.set(`${item.organizationId}:${item.workItemId}`, item);
  }

  complete(organizationId: string, workItemId: string): void {
    const item = this.work.get(`${organizationId}:${workItemId}`);
    if (!item) return;
    item.status = 'completed';
    item.completedAt = AFTER.toISOString();
  }

  async listOrganizationIdsNeedingOverdueRefresh(asOf: Date): Promise<string[]> {
    return organizationIdsNeedingOverdueRefresh(
      [...this.work.values()],
      [...this.attention.values()],
      asOf,
    );
  }

  async rebuildAttentionForOrganization(organizationId: string, asOf: Date): Promise<void> {
    const run = this.rebuildGate.then(async () => {
      this.rebuilds.push(organizationId);
      const workItems = [...this.work.values()].filter((item) => item.organizationId === organizationId);
      const approvals = this.approvals.filter((item) => item.organizationId === organizationId);
      const next = deriveAttentionReadModels(organizationId, workItems, approvals, asOf);
      for (const [key, item] of this.attention) {
        if (item.organizationId === organizationId) this.attention.delete(key);
      }
      for (const item of next) this.attention.set(item.attentionKey, item);
    });
    this.rebuildGate = run.then(
      () => undefined,
      () => undefined,
    );
    await run;
  }

  async upsertFreshness(
    organizationId: string,
    consumerKey: string,
    patch: Partial<Omit<ProjectionFreshness, 'organizationId' | 'consumerKey'>>,
  ): Promise<ProjectionFreshness> {
    const freshness: ProjectionFreshness = {
      organizationId,
      consumerKey,
      lastSuccessAt: patch.lastSuccessAt ?? null,
      lastEventOccurredAt: patch.lastEventOccurredAt ?? null,
      pendingOutboxCount: patch.pendingOutboxCount ?? 0,
      isStale: patch.isStale ?? false,
      lastError: patch.lastError ?? null,
      rebuiltAt: patch.rebuiltAt ?? null,
    };
    this.freshness.push(freshness);
    return freshness;
  }

  overdueFor(organizationId: string): StoredAttentionReadModel[] {
    return [...this.attention.values()].filter(
      (item) => item.organizationId === organizationId && item.attentionType === 'overdue_work',
    );
  }
}

function overdueKeys(store: MemoryAttentionStore, organizationId: string): string[] {
  return store.overdueFor(organizationId).map((item) => item.attentionKey).sort();
}

describe('attention clock', () => {
  it('does not mark future work overdue', async () => {
    const store = new MemoryAttentionStore();
    store.add(work({ workItemId: 'w-future', organizationId: 'org-a', ownerMemberId: 'owner-a', dueAt: FUTURE }));
    const clock = new AttentionClock(store, { logger: { info() {}, error() {} } });

    const result = await clock.runOnce(NOW);

    assert.equal(result.refreshedOrganizations, 0);
    assert.deepEqual(overdueKeys(store, 'org-a'), []);
    assert.equal(store.events.length, 0);
    assert.equal(isOpenWorkPastDue({ status: 'open', dueAt: FUTURE }, NOW), false);
    assert.equal(isOpenWorkPastDue({ status: 'open', dueAt: NOW.toISOString() }, NOW), false);
  });

  it('marks open work overdue when the clock crosses dueAt without a business event', async () => {
    const store = new MemoryAttentionStore();
    store.add(work({ workItemId: 'w-cross', organizationId: 'org-a', ownerMemberId: 'owner-a', dueAt: PAST }));
    const clock = new AttentionClock(store, { logger: { info() {}, error() {} } });

    const before = await clock.runOnce(new Date('2026-09-13T14:00:00.000Z'));
    assert.equal(before.refreshedOrganizations, 0);
    assert.deepEqual(overdueKeys(store, 'org-a'), []);

    const after = await clock.runOnce(NOW);
    assert.equal(after.refreshedOrganizations, 1);
    assert.deepEqual(after.organizationIds, ['org-a']);
    assert.equal(store.events.length, 0);
    const overdue = store.overdueFor('org-a');
    assert.equal(overdue.length, 1);
    assert.equal(overdue[0]?.attentionType, 'overdue_work');
    assert.equal(overdue[0]?.attentionKey, overdueAttentionKey('w-cross'));
    assert.equal(overdue[0]?.reasonCode, 'work.open.overdue');
    assert.equal(overdue[0]?.memberId, 'owner-a');
    assert.equal(overdue[0]?.reasonDetail.dueAt, PAST);
    assert.equal(store.freshness[0]?.consumerKey, OS_PROJECTION_CONSUMER_KEYS.workAttention);
    assert.equal(store.freshness[0]?.lastEventOccurredAt, null);
  });

  it('does not re-add overdue attention for completed work', async () => {
    const store = new MemoryAttentionStore();
    store.add(work({ workItemId: 'w-done', organizationId: 'org-a', ownerMemberId: 'owner-a', dueAt: PAST }));
    const clock = new AttentionClock(store, { logger: { info() {}, error() {} } });

    await clock.runOnce(NOW);
    assert.equal(store.overdueFor('org-a').length, 1);

    store.complete('org-a', 'w-done');
    await store.rebuildAttentionForOrganization('org-a', NOW);
    assert.deepEqual(overdueKeys(store, 'org-a'), []);

    const later = await clock.runOnce(AFTER);
    assert.equal(later.refreshedOrganizations, 0);
    assert.deepEqual(overdueKeys(store, 'org-a'), []);
  });

  it('clears a stale overdue row for completed work on the next tick', async () => {
    const store = new MemoryAttentionStore();
    store.add(work({
      workItemId: 'w-stale',
      organizationId: 'org-a',
      ownerMemberId: 'owner-a',
      status: 'completed',
      dueAt: PAST,
      completedAt: PAST,
    }));
    store.attention.set(overdueAttentionKey('w-stale'), {
      attentionKey: overdueAttentionKey('w-stale'),
      organizationId: 'org-a',
      memberId: 'owner-a',
      attentionType: 'overdue_work',
      reasonCode: 'work.open.overdue',
      reasonDetail: { dueAt: PAST },
      resourceType: 'work_item',
      resourceId: 'w-stale',
      workItemId: 'w-stale',
      approvalRequestId: null,
      subjectType: 'party',
      subjectId: 'party-1',
      isActive: true,
      derivedAt: NOW,
      updatedAt: NOW,
    });

    const clock = new AttentionClock(store, { logger: { info() {}, error() {} } });
    const result = await clock.runOnce(NOW);
    assert.equal(result.refreshedOrganizations, 1);
    assert.deepEqual(overdueKeys(store, 'org-a'), []);
  });

  it('refreshes only the tenant whose work crossed dueAt', async () => {
    const store = new MemoryAttentionStore();
    store.add(work({ workItemId: 'w-a', organizationId: 'org-a', ownerMemberId: 'owner-a', dueAt: PAST }));
    store.add(work({ workItemId: 'w-b', organizationId: 'org-b', ownerMemberId: 'owner-b', dueAt: FUTURE }));
    store.attention.set('work:owner:w-b', {
      attentionKey: 'work:owner:w-b',
      organizationId: 'org-b',
      memberId: 'owner-b',
      attentionType: 'open_work_assigned',
      reasonCode: 'work.open.owned',
      reasonDetail: {},
      resourceType: 'work_item',
      resourceId: 'w-b',
      workItemId: 'w-b',
      approvalRequestId: null,
      subjectType: null,
      subjectId: null,
      isActive: true,
      derivedAt: NOW,
      updatedAt: NOW,
    });

    const clock = new AttentionClock(store, { logger: { info() {}, error() {} } });
    const result = await clock.runOnce(NOW);

    assert.deepEqual(result.organizationIds, ['org-a']);
    assert.equal(store.overdueFor('org-a')[0]?.memberId, 'owner-a');
    assert.deepEqual(overdueKeys(store, 'org-b'), []);
    assert.equal(store.attention.get('work:owner:w-b')?.organizationId, 'org-b');
    assert.equal(store.rebuilds.includes('org-b'), false);
  });

  it('is idempotent across a restart and does not duplicate attention', async () => {
    const store = new MemoryAttentionStore();
    store.add(work({
      workItemId: 'w-again',
      organizationId: 'org-a',
      ownerMemberId: 'owner-a',
      dueAt: PAST,
      lastReassignedAt: new Date('2026-09-01T00:00:00.000Z'),
    }));
    const silent = { info() {}, error() {} };
    const clock = new AttentionClock(store, { logger: silent });

    await clock.runOnce(NOW);
    await clock.stop();
    const restarted = new AttentionClock(store, { logger: silent });
    restarted.start();
    const second = await restarted.runOnce(AFTER);
    await restarted.stop();

    assert.equal(second.refreshedOrganizations, 0);
    assert.deepEqual(overdueKeys(store, 'org-a'), [overdueAttentionKey('w-again')]);
    const types = [...store.attention.values()]
      .filter((item) => item.organizationId === 'org-a')
      .map((item) => item.attentionType)
      .sort();
    assert.deepEqual(types, ['open_work_assigned', 'overdue_work', 'reassigned_work']);
    assert.equal(new Set([...store.attention.keys()]).size, store.attention.size);
  });

  it('keeps open-work and approval attention when adding overdue', async () => {
    const store = new MemoryAttentionStore();
    store.add(work({ workItemId: 'w-open', organizationId: 'org-a', ownerMemberId: 'owner-a', dueAt: PAST }));
    store.approvals.push({
      approvalRequestId: 'appr-1',
      organizationId: 'org-a',
      workItemId: 'w-open',
      subjectType: 'work_item',
      subjectId: 'w-open',
      requestedByMemberId: 'owner-a',
      approverMemberId: 'approver-a',
      status: 'pending',
      decisionByMemberId: null,
      decisionReason: null,
      decidedAt: null,
      requiredScope: 'approval.act',
      lastEventId: null,
      lastOccurredAt: null,
      updatedAt: NOW,
    });

    const clock = new AttentionClock(store, { logger: { info() {}, error() {} } });
    await clock.runOnce(NOW);

    const types = [...store.attention.values()].map((item) => item.attentionType).sort();
    assert.deepEqual(types, ['open_work_assigned', 'overdue_work', 'pending_approval']);
    assert.equal(
      [...store.attention.values()].find((item) => item.attentionType === 'pending_approval')?.memberId,
      'approver-a',
    );
  });
});
