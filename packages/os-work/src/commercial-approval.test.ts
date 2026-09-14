import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import type { RequestContext } from '@isalwa/os-contracts';
import { validateApprovalSubject } from './approval-subjects';
import type { OsWorkStore } from './os-work-store';
import type { ApprovalRequestRecord, CommercialApprovalSubjectRecord } from './store-types';
import { WorkCommandService } from './work-command-service';

const ORG = 'org-a';
const OWNER = 'mem-owner';
const OTHER = 'mem-other';
const APPROVER = 'mem-approver';
const DELEGATE = 'mem-delegate';
const NOW = new Date('2026-09-13T12:00:00.000Z');

function ctx(actorMemberId: string, organizationId = ORG): RequestContext {
  return {
    organizationId,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId: 'corr-approval',
    effectiveAt: NOW,
  };
}

function subject(
  overrides: Partial<CommercialApprovalSubjectRecord> = {},
): CommercialApprovalSubjectRecord {
  return {
    id: 'subject-1',
    organizationId: ORG,
    ownerMemberId: OWNER,
    status: 'submitted',
    partyId: 'party-1',
    ...overrides,
  };
}

function approvalStore(input: {
  quote?: CommercialApprovalSubjectRecord | null;
  order?: CommercialApprovalSubjectRecord | null;
  delegateFor?: string | null;
}) {
  const approvals: ApprovalRequestRecord[] = [];
  const events: string[] = [];
  const store = {
    approvals,
    events,
    async runInTransaction(fn: (store: OsWorkStore) => Promise<unknown>) {
      return fn(store as unknown as OsWorkStore);
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      if (organizationId !== ORG) return null;
      if (memberId === 'missing') return null;
      return { id: memberId, organizationId, accessStatus: memberId === 'inactive' ? 'suspended' : 'active' };
    },
    async listRoleAssignmentsForMember(memberId: string) {
      if (memberId === OTHER) {
        return [{ roleKey: 'people.admin', effectiveAt: new Date('2026-01-01'), endedAt: null }];
      }
      return [];
    },
    async listDelegationsForDelegate(memberId: string) {
      if (memberId !== DELEGATE || !input.delegateFor) return [];
      return [
        {
          scopes: ['approval.act'],
          startsAt: new Date('2026-01-01'),
          expiresAt: new Date('2027-01-01'),
          revokedAt: null,
          delegatorMemberId: input.delegateFor,
        },
      ];
    },
    async partyExistsInOrg() {
      return false;
    },
    async getQuoteApprovalSubject(organizationId: string, quoteId: string) {
      const row = input.quote === undefined ? subject() : input.quote;
      if (!row || organizationId !== row.organizationId || quoteId !== row.id) return null;
      return row;
    },
    async getOrderApprovalSubject(organizationId: string, orderId: string) {
      const row = input.order === undefined ? subject({ status: 'open' }) : input.order;
      if (!row || organizationId !== row.organizationId || orderId !== row.id) return null;
      return row;
    },
    async listApprovalsForSubject() {
      return approvals;
    },
    async insertApprovalRequest(request: ApprovalRequestRecord) {
      approvals.push(request);
    },
    async getApprovalRequest(organizationId: string, approvalRequestId: string) {
      return approvals.find((row) => row.organizationId === organizationId && row.id === approvalRequestId) ?? null;
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
    async appendEventAndAudit(event: { eventType: string }) {
      events.push(event.eventType);
    },
    async findIdempotency() {
      return null;
    },
    async saveIdempotency() {},
  };
  return store;
}

describe('quote and order approval subjects', () => {
  it('accepts a submitted quote and an open order in the same tenant', async () => {
    const store = approvalStore({}) as unknown as OsWorkStore;
    await validateApprovalSubject(store, ORG, 'quote', 'subject-1');
    await validateApprovalSubject(store, ORG, 'order', 'subject-1');
  });

  it('denies a cross-tenant or unknown subject id', async () => {
    const store = approvalStore({
      quote: subject({ organizationId: 'org-b' }),
      order: null,
    }) as unknown as OsWorkStore;
    await assert.rejects(() => validateApprovalSubject(store, ORG, 'quote', 'subject-1'), /NOT_FOUND/);
    await assert.rejects(() => validateApprovalSubject(store, ORG, 'order', 'missing'), /NOT_FOUND/);
  });

  it('denies an invalid subject type and ineligible lifecycle', async () => {
    const store = approvalStore({
      quote: subject({ status: 'draft' }),
      order: subject({ status: 'cancelled' }),
    }) as unknown as OsWorkStore;
    await assert.rejects(() => validateApprovalSubject(store, ORG, 'commercial_account', 'subject-1'), /VALIDATION_FAILED/);
    await assert.rejects(() => validateApprovalSubject(store, ORG, 'quote', 'subject-1'), /VALIDATION_FAILED/);
    await assert.rejects(() => validateApprovalSubject(store, ORG, 'order', 'subject-1'), /VALIDATION_FAILED/);
  });
});

describe('manual commercial approval commands', () => {
  it('lets the subject owner request approval and does not create an order', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const result = await service.execute('RequestApproval', ctx(OWNER), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
    });
    assert.equal(result.data.subjectType, 'quote');
    assert.equal(store.events.includes('approval.requested'), true);
    assert.equal(store.events.includes('order.created'), false);
    assert.equal(store.approvals[0]?.status, 'pending');
  });

  it('denies an unauthorized request, including people.admin who does not own the subject', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    await assert.rejects(
      () =>
        service.execute('RequestApproval', ctx(OTHER), {
          approverMemberId: APPROVER,
          subjectType: 'order',
          subjectId: 'subject-1',
        }),
      /PERMISSION_DENIED/,
    );
  });

  it('lets the approver or an active delegate decide, and denies everyone else', async () => {
    const store = approvalStore({ delegateFor: APPROVER, order: subject({ status: 'open' }) });
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), {
      approverMemberId: APPROVER,
      subjectType: 'order',
      subjectId: 'subject-1',
    });
    const approvalRequestId = String(requested.data.approvalRequestId);

    await assert.rejects(
      () => service.execute('Approve', ctx(OTHER), { approvalRequestId }),
      /PERMISSION_DENIED/,
    );

    const decided = await service.execute('Approve', ctx(DELEGATE), { approvalRequestId, reason: 'ok' });
    assert.equal(decided.data.decision, 'approved');
    assert.equal(store.events.includes('order.created'), false);
    assert.equal(store.events.includes('approval.approved'), true);
  });

  it('records rejection without rewriting the commercial subject', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
    });
    await service.execute('Reject', ctx(APPROVER), {
      approvalRequestId: requested.data.approvalRequestId,
      reason: 'Revisar precio',
    });
    assert.deepEqual(store.events, ['approval.requested', 'approval.rejected']);
  });

  it('does not call CreateOrder from the approval decision path', () => {
    const source = readFileSync(resolve(__dirname, 'work-command-service.ts'), 'utf8');
    const start = source.indexOf('private async decideApproval');
    const end = source.indexOf('private async approve');
    assert.doesNotMatch(source.slice(start, end), /CreateOrder|insertOrder|order\.created/);
    assert.doesNotMatch(source, /commercial\.(team|org)\.read/);
  });
});
