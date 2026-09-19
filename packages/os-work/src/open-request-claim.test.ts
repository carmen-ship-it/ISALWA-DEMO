import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import type { OsWorkStore } from './os-work-store';
import type { ApprovalRequestRecord, IdempotencyRecord, WorkItemRecord } from './store-types';
import { WorkCommandService } from './work-command-service';

const ORG = 'org-a';
const ACTOR = 'mem-a';
const NOW = new Date('2026-09-19T12:00:00.000Z');

function ctx(): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId: ACTOR,
    personId: 'person-a',
    authIdentityId: 'auth-a',
    correlationId: 'corr',
    effectiveAt: NOW,
  };
}

function claimStore() {
  const approvals: ApprovalRequestRecord[] = [];
  const work: WorkItemRecord[] = [];
  const keys = new Map<string, IdempotencyRecord>();
  const store = {
    approvals,
    work,
    async runInTransaction(fn: (inner: OsWorkStore) => Promise<unknown>) {
      const approvalSnapshot = approvals.slice();
      const workSnapshot = work.slice();
      const keySnapshot = new Map(keys);
      try {
        return await fn(store as unknown as OsWorkStore);
      } catch (err) {
        approvals.splice(0, approvals.length, ...approvalSnapshot);
        work.splice(0, work.length, ...workSnapshot);
        keys.clear();
        for (const [id, row] of keySnapshot) keys.set(id, row);
        throw err;
      }
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      if (organizationId !== ORG) return null;
      return { id: memberId, organizationId, accessStatus: 'active' };
    },
    async listRoleAssignmentsForMember() {
      return [];
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async partyExistsInOrg() {
      return true;
    },
    async getQuoteApprovalSubject() {
      return null;
    },
    async getOrderApprovalSubject() {
      return null;
    },
    async listApprovalsForSubject() {
      return approvals;
    },
    async insertApprovalRequest(request: ApprovalRequestRecord) {
      approvals.push(request);
    },
    async getApprovalRequest(organizationId: string, approvalRequestId: string) {
      return (
        approvals.find((row) => row.organizationId === organizationId && row.id === approvalRequestId) ??
        null
      );
    },
    async decidePendingApprovalRequest(
      organizationId: string,
      approvalRequestId: string,
      patch: Pick<ApprovalRequestRecord, 'status' | 'decisionByMemberId' | 'decisionReason' | 'decidedAt'>,
    ) {
      const row = approvals.find((item) => item.organizationId === organizationId && item.id === approvalRequestId);
      if (!row || row.status !== 'pending') return false;
      Object.assign(row, patch);
      return true;
    },
    async insertWorkItem(item: WorkItemRecord) {
      work.push(item);
    },
    async getWorkItemInOrg(organizationId: string, workItemId: string) {
      return work.find((row) => row.organizationId === organizationId && row.id === workItemId) ?? null;
    },
    async updateWorkItem(workItemId: string, patch: Partial<WorkItemRecord>) {
      const row = work.find((item) => item.id === workItemId);
      if (row) Object.assign(row, patch);
    },
    async insertOwnershipHistory() {},
    async appendEventAndAudit() {},
    async findIdempotency(organizationId: string, key: string) {
      const row = keys.get(`${organizationId}:${key}`);
      if (!row || row.expiresAt.getTime() <= Date.now()) return null;
      return row;
    },
    async saveIdempotency(record: IdempotencyRecord) {
      const id = `${record.organizationId}:${record.key}`;
      if (keys.has(id)) {
        throw Object.assign(new Error('IDEMPOTENCY_CONFLICT'), { code: 'P2002' });
      }
      keys.set(id, record);
    },
    async deleteIdempotency(organizationId: string, key: string) {
      keys.delete(`${organizationId}:${key}`);
    },
  };
  return store;
}

describe('open request claims', () => {
  it('returns the same pending approval when two requests race', async () => {
    const store = claimStore();
    const svc = new WorkCommandService(store as unknown as OsWorkStore);
    const payload = {
      approverMemberId: ACTOR,
      subjectType: 'party',
      subjectId: 'party-1',
    };
    const first = await svc.execute('RequestApproval', ctx(), payload, 'tab-a');
    const second = await svc.execute('RequestApproval', ctx(), payload, 'tab-b');
    assert.equal(second.data.approvalRequestId, first.data.approvalRequestId);
    assert.equal(store.approvals.length, 1);

    await svc.execute('Reject', ctx(), {
      approvalRequestId: String(first.data.approvalRequestId),
      reason: 'Cierre de prueba',
    });
    const later = await svc.execute('RequestApproval', ctx(), payload, 'tab-c');
    assert.notEqual(later.data.approvalRequestId, first.data.approvalRequestId);
    assert.equal(store.approvals.length, 2);
  });

  it('returns the same open department review and allows another after complete', async () => {
    const store = claimStore();
    const svc = new WorkCommandService(store as unknown as OsWorkStore);
    const payload = {
      title: 'Revisión de compras',
      ownerMemberId: ACTOR,
      description: '[[order-prep:purchasing:order-1]]',
    };
    const first = await svc.execute('CreateWorkItem', ctx(), payload, 'tab-a');
    const second = await svc.execute('CreateWorkItem', ctx(), payload, 'tab-b');
    assert.equal(second.data.workItemId, first.data.workItemId);
    assert.equal(store.work.length, 1);

    await svc.execute('CompleteWork', ctx(), { workItemId: String(first.data.workItemId) });
    const later = await svc.execute('CreateWorkItem', ctx(), payload, 'tab-c');
    assert.notEqual(later.data.workItemId, first.data.workItemId);
    assert.equal(store.work.filter((row) => row.status === 'open').length, 1);
  });
});
