import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import type { OsWorkStore } from './os-work-store';
import type { OwnershipHistoryRecord, WorkItemRecord } from './store-types';
import { WorkCommandService } from './work-command-service';

const ORG = 'org-a';
const ADMIN = 'mem-admin';
const FROM = 'mem-from';
const TO = 'mem-to';

function ctx(actorMemberId: string): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId,
    personId: 'person',
    authIdentityId: 'auth',
    correlationId: createId(),
    effectiveAt: new Date('2026-08-01T12:00:00.000Z'),
  };
}

function workStore(roleKeysByMember: Record<string, string[]>) {
  const workItems = new Map<string, WorkItemRecord>();
  const ownership: OwnershipHistoryRecord[] = [];

  const store = {
    async runInTransaction(fn: (next: OsWorkStore) => Promise<unknown>) {
      return fn(store as unknown as OsWorkStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      if (organizationId !== ORG) return null;
      return { id: memberId, organizationId: ORG, accessStatus: 'active' as const };
    },
    async listRoleAssignmentsForMember(memberId: string) {
      return (roleKeysByMember[memberId] ?? []).map((roleKey) => ({
        roleKey,
        effectiveAt: new Date('2026-01-01'),
        endedAt: null,
      }));
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async partyExistsInOrg() {
      return false;
    },
    async getQuoteApprovalSubject() {
      return null;
    },
    async getOrderApprovalSubject() {
      return null;
    },
    async listApprovalsForSubject() {
      return [];
    },
    async insertWorkItem(item: WorkItemRecord) {
      workItems.set(item.id, item);
    },
    async getWorkItemInOrg(organizationId: string, workItemId: string) {
      const item = workItems.get(workItemId);
      return item && item.organizationId === organizationId ? item : null;
    },
    async updateWorkItem(workItemId: string, patch: Partial<WorkItemRecord>, expectedVersion: number) {
      const item = workItems.get(workItemId);
      if (!item || item.version !== expectedVersion) throw new Error('CONFLICT');
      workItems.set(workItemId, { ...item, ...patch, version: expectedVersion + 1 });
    },
    async listOpenWorkItemsForMember() {
      return [];
    },
    async insertOwnershipHistory(record: OwnershipHistoryRecord) {
      ownership.push(record);
    },
    async listOwnershipHistory(organizationId: string, workItemId: string) {
      return ownership
        .filter((row) => row.organizationId === organizationId && row.workItemId === workItemId)
        .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
    },
    async insertApprovalRequest() {},
    async getApprovalRequest() {
      return null;
    },
    async decidePendingApprovalRequest() {
      return false;
    },
    async reassignPendingApprover() {
      return false;
    },
    async appendEventAndAudit() {},
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };

  return { store: store as unknown as OsWorkStore, workItems, ownership };
}

describe('ReassignWork attribution', () => {
  it('denies ReassignWork without people.admin', async () => {
    const { store, workItems } = workStore({ [FROM]: ['sales_rep'], [TO]: ['sales_rep'] });
    const workId = createId();
    workItems.set(workId, {
      id: workId,
      organizationId: ORG,
      ownerMemberId: FROM,
      createdByMemberId: FROM,
      title: 'Task',
      description: null,
      status: 'open',
      priority: 'normal',
      dueAt: null,
      subjectType: null,
      subjectId: null,
      completedAt: null,
      cancelledAt: null,
      version: 0,
    });

    await assert.rejects(
      new WorkCommandService(store).execute('ReassignWork', ctx(FROM), {
        workItemId: workId,
        newOwnerMemberId: TO,
      }),
      /PERMISSION_DENIED/,
    );
  });

  it('appends ownership history without rewriting prior attribution', async () => {
    const { store, workItems, ownership } = workStore({
      [ADMIN]: ['people.admin'],
      [FROM]: ['sales_rep'],
      [TO]: ['sales_rep'],
    });
    const workId = createId();
    workItems.set(workId, {
      id: workId,
      organizationId: ORG,
      ownerMemberId: FROM,
      createdByMemberId: FROM,
      title: 'Task',
      description: null,
      status: 'open',
      priority: 'normal',
      dueAt: null,
      subjectType: null,
      subjectId: null,
      completedAt: null,
      cancelledAt: null,
      version: 0,
    });
    ownership.push({
      id: createId(),
      organizationId: ORG,
      workItemId: workId,
      fromMemberId: null,
      toMemberId: FROM,
      changedByMemberId: FROM,
      reason: 'created',
      changedAt: new Date('2026-07-01T12:00:00.000Z'),
    });

    await new WorkCommandService(store).execute('ReassignWork', ctx(ADMIN), {
      workItemId: workId,
      newOwnerMemberId: TO,
    });

    const history = await store.listOwnershipHistory(ORG, workId);
    assert.equal(history.length, 2);
    assert.equal(history[0]?.toMemberId, FROM);
    assert.equal(history[0]?.changedByMemberId, FROM);
    assert.equal(history[1]?.fromMemberId, FROM);
    assert.equal(history[1]?.toMemberId, TO);
    assert.equal(history[1]?.changedByMemberId, ADMIN);
  });
});
