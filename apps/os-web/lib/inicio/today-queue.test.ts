import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import type { IssueListItem } from '@/lib/issue/types';
import { buildTodayQueue, TODAY_QUEUE_COPY } from '@/lib/inicio/today-queue';

const AS_OF = new Date('2026-09-16T18:00:00.000Z'); // afternoon La Paz mid-day-ish

function work(partial: Partial<WorkSummaryReadModel> & { workItemId: string }): WorkSummaryReadModel {
  return {
    organizationId: 'org-1',
    ownerMemberId: 'mem-1',
    createdByMemberId: 'mem-1',
    title: 'Llamar al cliente',
    description: '',
    status: 'open',
    dueAt: null,
    subjectType: 'party',
    subjectId: 'pty-1',
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

function attention(
  partial: Partial<AttentionItemReadModel> & { attentionKey: string; workItemId: string },
): AttentionItemReadModel {
  return {
    organizationId: 'org-1',
    memberId: 'mem-1',
    attentionType: 'overdue_work',
    reasonCode: 'due_past',
    reasonDetail: {},
    resourceType: 'work_item',
    resourceId: partial.workItemId,
    approvalRequestId: null,
    subjectType: 'party',
    subjectId: 'pty-1',
    isActive: true,
    ...partial,
  };
}

function approval(
  partial: Partial<ApprovalSummaryReadModel> & { approvalRequestId: string },
): ApprovalSummaryReadModel {
  return {
    organizationId: 'org-1',
    workItemId: null,
    subjectType: 'quote',
    subjectId: 'q1',
    requestedByMemberId: 'mem-2',
    approverMemberId: 'mem-1',
    status: 'pending',
    decisionByMemberId: null,
    decisionReason: null,
    decidedAt: null,
    requiredScope: null,
    ...partial,
  };
}

function commitment(partial: Partial<CommitmentSummary> & { id: string }): CommitmentSummary {
  return {
    id: partial.id,
    organizationId: 'org-1',
    partyId: 'pty-1',
    ownerMemberId: 'mem-1',
    text: partial.text ?? 'Confirmar despacho',
    dueAt: partial.dueAt ?? '2026-09-16T12:00:00.000Z',
    origin: 'manual',
    relatedSubjectType: null,
    relatedSubjectId: null,
    lifecycle: 'open',
    state: partial.state ?? 'due_today',
    createdByMemberId: 'mem-1',
    createdAt: '2026-09-01T12:00:00.000Z',
    fulfilledAt: null,
    fulfilledByMemberId: null,
    cancelledAt: null,
  };
}

function issue(partial: Partial<IssueListItem> & { issueId: string }): IssueListItem {
  return {
    issueId: partial.issueId,
    title: partial.title ?? null,
    description: partial.description ?? 'Falta material',
    status: partial.status ?? 'reported',
    reporterMemberId: 'mem-1',
    ownerMemberId: partial.ownerMemberId ?? 'mem-1',
    createdAt: '2026-09-10T12:00:00.000Z',
    references: [],
  };
}

describe('buildTodayQueue', () => {
  it('orders overdue before due-today and exposes deterministic next action', () => {
    const overdue = work({
      workItemId: 'w-over',
      dueAt: '2026-09-15T12:00:00.000Z',
      title: 'Cobrar saldo',
    });
    const today = work({
      workItemId: 'w-today',
      dueAt: '2026-09-16T23:00:00.000Z',
      title: 'Confirmar pedido',
    });
    const later = work({
      workItemId: 'w-later',
      dueAt: '2026-09-20T12:00:00.000Z',
      title: 'Visita',
    });

    const queue = buildTodayQueue({
      memberId: 'mem-1',
      asOf: AS_OF,
      work: [later, today, overdue],
      attention: [
        attention({
          attentionKey: 'work:overdue:w-over',
          workItemId: 'w-over',
        }),
      ],
      partyLabels: new Map([['pty-1', 'Acme']]),
    });

    assert.equal(queue.empty, false);
    assert.deepEqual(
      queue.buckets.map((b) => b.id),
      ['overdue', 'due_today', 'next_actions'],
    );
    assert.equal(queue.nextAction?.id, 'attention:work:overdue:w-over');
    assert.match(queue.nextAction?.title ?? '', /Cobrar saldo/);
    assert.equal(queue.buckets[0]?.items[0]?.overdue, true);
    assert.equal(queue.buckets[1]?.items[0]?.bucket, 'due_today');
  });

  it('keeps only approvals assigned to the member', () => {
    const queue = buildTodayQueue({
      memberId: 'mem-1',
      asOf: AS_OF,
      approvals: [
        approval({ approvalRequestId: 'a-mine' }),
        approval({ approvalRequestId: 'a-other', approverMemberId: 'mem-9' }),
      ],
      approvalSubjects: new Map([['a-mine', 'Cotización Q-1']]),
    });
    assert.equal(queue.buckets.length, 1);
    assert.equal(queue.buckets[0]?.id, 'pending_approvals');
    assert.equal(queue.buckets[0]?.items.length, 1);
    assert.equal(queue.buckets[0]?.items[0]?.title, 'Cotización Q-1');
  });

  it('includes governed commitments and owned open issues without inventing KPIs', () => {
    const queue = buildTodayQueue({
      memberId: 'mem-1',
      asOf: AS_OF,
      commitments: [
        commitment({ id: 'c1', state: 'overdue' }),
        commitment({ id: 'c2', state: 'pending', text: 'No hoy' }),
      ],
      issues: [
        issue({ issueId: 'i1', title: 'Retraso planta' }),
        issue({ issueId: 'i2', ownerMemberId: 'mem-9', description: 'Ajeno' }),
      ],
    });
    const ids = queue.buckets.flatMap((b) => b.items.map((i) => i.id));
    assert.ok(ids.includes('commitment:c1'));
    assert.ok(!ids.includes('commitment:c2'));
    assert.ok(ids.includes('issue:i1'));
    assert.ok(!ids.includes('issue:i2'));
    assert.match(TODAY_QUEUE_COPY.description, /correo/);
    assert.match(TODAY_QUEUE_COPY.description, /WhatsApp/);
  });

  it('treats dueAt equality boundary as not overdue and due-today when calendar matches', () => {
    const exact = work({
      workItemId: 'w-edge',
      dueAt: AS_OF.toISOString(),
      title: 'En el límite',
    });
    const queue = buildTodayQueue({
      memberId: 'mem-1',
      asOf: AS_OF,
      work: [exact],
    });
    assert.equal(queue.buckets[0]?.id, 'due_today');
    assert.equal(queue.buckets[0]?.items[0]?.overdue, false);
  });
});
