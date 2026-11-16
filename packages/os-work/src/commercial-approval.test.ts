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
const GERENTE = 'mem-gerente';
const NO_SCOPE = 'mem-no-price-scope';
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
    status: 'draft',
    partyId: 'party-1',
    revisionNumber: 1,
    ...overrides,
  };
}

function approvalStore(input: {
  quote?: CommercialApprovalSubjectRecord | null;
  order?: CommercialApprovalSubjectRecord | null;
  delegateFor?: string | null;
  delegatorStatus?: string;
  delegatorRoleKeys?: string[];
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
      // Only these members hold commercial.price.approve in their own right.
      if ([OWNER, APPROVER, GERENTE].includes(memberId)) {
        return [{ roleKey: 'commercial.price.approve', effectiveAt: new Date('2026-01-01'), endedAt: null }];
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
          organizationId: ORG,
          delegator: {
            organizationId: ORG,
            accessStatus: input.delegatorStatus ?? 'active',
            roleAssignments: (input.delegatorRoleKeys ?? ['approval.act']).map((roleKey) => ({
              roleKey,
              effectiveAt: new Date('2026-01-01'),
              endedAt: null,
            })),
          },
        },
      ];
    },
    async partyExistsInOrg() {
      return false;
    },
    quoteRow: (input.quote === undefined ? subject() : input.quote) as CommercialApprovalSubjectRecord | null,
    async getQuoteApprovalSubject(organizationId: string, quoteId: string) {
      const row = store.quoteRow;
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
    async reassignPendingApprover(
      organizationId: string,
      approvalRequestId: string,
      patch: { approverMemberId: string; contextSnapshotJson: Record<string, unknown> },
    ) {
      const row = approvals.find((item) => item.organizationId === organizationId && item.id === approvalRequestId);
      if (!row || row.status !== 'pending') return false;
      row.approverMemberId = patch.approverMemberId;
      row.contextSnapshotJson = patch.contextSnapshotJson;
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
  it('accepts a draft quote (approval before issue) and an open order in the same tenant', async () => {
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
      quote: subject({ status: 'submitted' }),
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

  it('F10: the delegate cannot decide once the approver is suspended or no longer holds approval.act', async () => {
    for (const variant of [{ delegatorStatus: 'suspended' }, { delegatorRoleKeys: [] as string[] }]) {
      const store = approvalStore({ delegateFor: APPROVER, order: subject({ status: 'open' }), ...variant });
      const service = new WorkCommandService(store as unknown as OsWorkStore);
      const requested = await service.execute('RequestApproval', ctx(OWNER), {
        approverMemberId: APPROVER,
        subjectType: 'order',
        subjectId: 'subject-1',
      });
      await assert.rejects(
        () => service.execute('Approve', ctx(DELEGATE), { approvalRequestId: String(requested.data.approvalRequestId) }),
        /PERMISSION_DENIED/,
        JSON.stringify(variant),
      );
      assert.equal(store.events.includes('approval.approved'), false);
    }
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

  it('lets the current approver escalate to an explicitly selected Gerencia member', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
      context: { note: 'Excepción de margen' },
    });
    const approvalRequestId = String(requested.data.approvalRequestId);

    await assert.rejects(
      () =>
        service.execute('EscalateApproval', ctx(OTHER), {
          approvalRequestId,
          newApproverMemberId: GERENTE,
        }),
      /PERMISSION_DENIED/,
    );

    const escalated = await service.execute('EscalateApproval', ctx(APPROVER), {
      approvalRequestId,
      newApproverMemberId: GERENTE,
      reason: 'Requiere Gerencia',
    });
    assert.equal(escalated.data.toApproverMemberId, GERENTE);
    assert.equal(escalated.data.fromApproverMemberId, APPROVER);
    assert.equal(store.approvals[0]?.approverMemberId, GERENTE);
    assert.equal(store.approvals[0]?.status, 'pending');
    assert.equal(store.events.includes('approval.escalated'), true);
    const history = store.approvals[0]?.contextSnapshotJson.escalationHistory;
    assert.equal(Array.isArray(history) && history.length === 1, true);

    const decided = await service.execute('Approve', ctx(GERENTE), { approvalRequestId, reason: 'ok' });
    assert.equal(decided.data.decision, 'approved');
  });

  it('does not call CreateOrder from the approval decision path', () => {
    const source = readFileSync(resolve(__dirname, 'work-command-service.ts'), 'utf8');
    const start = source.indexOf('private async decideApproval');
    const end = source.indexOf('private async approve');
    assert.doesNotMatch(source.slice(start, end), /CreateOrder|insertOrder|order\.created/);
    assert.doesNotMatch(source, /commercial\.(team|org)\.read/);
  });
});

describe('T04 quote approval: draft-first, no self-approval, exact revision', () => {
  const request = (approver: string) => ({
    approverMemberId: approver,
    subjectType: 'quote',
    subjectId: 'subject-1',
  });

  it('lets a draft quote request approval and binds the exact revision', async () => {
    const store = approvalStore({ quote: subject({ revisionNumber: 4 }) });
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    await service.execute('RequestApproval', ctx(OWNER), request(APPROVER));
    assert.equal(store.approvals[0]?.contextSnapshotJson.boundRevision, 4);
    assert.equal(store.approvals[0]?.approverMemberId, APPROVER);
  });

  it('refuses a request for a quote that was already issued', async () => {
    const store = approvalStore({ quote: subject({ status: 'submitted' }) });
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    await assert.rejects(() => service.execute('RequestApproval', ctx(OWNER), request(APPROVER)), /VALIDATION_FAILED/);
    assert.equal(store.approvals.length, 0);
  });

  it('refuses self-approval even when the requester holds commercial.price.approve', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    await assert.rejects(() => service.execute('RequestApproval', ctx(OWNER), request(OWNER)), /PERMISSION_DENIED/);
    assert.equal(store.approvals.length, 0);
    assert.equal(store.events.length, 0);
  });

  it('refuses an approver without commercial.price.approve, including people.admin', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    for (const approver of [NO_SCOPE, OTHER]) {
      await assert.rejects(
        () => service.execute('RequestApproval', ctx(OWNER), request(approver)),
        /PERMISSION_DENIED/,
        approver,
      );
    }
    assert.equal(store.approvals.length, 0);
  });

  it('approves while the bound revision is still the quote revision', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), request(APPROVER));
    const decided = await service.execute('Approve', ctx(APPROVER), {
      approvalRequestId: requested.data.approvalRequestId,
    });
    assert.equal(decided.data.decision, 'approved');
    assert.equal(store.approvals[0]?.status, 'approved');
  });

  it('refuses a stale approval: a material change moved the quote revision', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), request(APPROVER));
    store.quoteRow = subject({ revisionNumber: 2 });
    await assert.rejects(
      () => service.execute('Approve', ctx(APPROVER), { approvalRequestId: requested.data.approvalRequestId }),
      /CONFLICT/,
    );
    assert.equal(store.approvals[0]?.status, 'pending');
    assert.equal(store.events.includes('approval.approved'), false);
  });

  it('refuses to approve a quote that was issued after the request', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), request(APPROVER));
    store.quoteRow = subject({ status: 'submitted' });
    await assert.rejects(
      () => service.execute('Approve', ctx(APPROVER), { approvalRequestId: requested.data.approvalRequestId }),
      /CONFLICT/,
    );
  });

  it('still lets the approver reject a stale request', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), request(APPROVER));
    store.quoteRow = subject({ revisionNumber: 2 });
    await service.execute('Reject', ctx(APPROVER), {
      approvalRequestId: requested.data.approvalRequestId,
      reason: 'Cambió el precio',
    });
    assert.equal(store.approvals[0]?.status, 'rejected');
  });

  it('refuses to escalate a quote approval to a member without commercial.price.approve or to the requester', async () => {
    const store = approvalStore({});
    const service = new WorkCommandService(store as unknown as OsWorkStore);
    const requested = await service.execute('RequestApproval', ctx(OWNER), request(APPROVER));
    const approvalRequestId = requested.data.approvalRequestId;
    for (const newApproverMemberId of [NO_SCOPE, OWNER]) {
      await assert.rejects(
        () => service.execute('EscalateApproval', ctx(APPROVER), { approvalRequestId, newApproverMemberId }),
        /PERMISSION_DENIED/,
        newApproverMemberId,
      );
    }
    assert.equal(store.approvals[0]?.approverMemberId, APPROVER);
  });
});
