import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ApprovalSummaryReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import type { IssueListItem } from '@/lib/issue/types';
import type { EvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  filterApprovalsForEvaluation,
  filterCommitmentsForEvaluation,
  filterPendingApprovalsForLens,
  filterWorkForEvaluation,
  filterCommercialOwnerRowsForEvaluation,
} from '@/lib/inicio/filter-for-evaluation';
import { buildInicioSummaryCounts } from '@/lib/inicio/summary-counts';
import {
  evaluationAllowsDesk,
  evaluationAllowsApprovalAuthority,
} from '@/lib/role-preview/evaluation-resource-access';

function projection(
  partial: Partial<EvaluationProjection> & Pick<EvaluationProjection, 'persona' | 'active'>,
): EvaluationProjection {
  return {
    subjectMemberId: null,
    readOnly: partial.active,
    commercialVisibility: null,
    presentationScopes: [],
    ...partial,
  };
}

function work(
  partial: Partial<WorkSummaryReadModel> & { workItemId: string },
): WorkSummaryReadModel {
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

function approval(
  partial: Partial<ApprovalSummaryReadModel> & { approvalRequestId: string },
): ApprovalSummaryReadModel {
  return {
    organizationId: 'org-1',
    workItemId: null,
    subjectType: 'quote',
    subjectId: 'q-1',
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

describe('inicio evaluation filters', () => {
  const asesor = projection({
    active: true,
    persona: 'asesor',
    subjectMemberId: 'mem_a',
    commercialVisibility: 'own',
  });

  it('Asesor without subject fail-closes work', () => {
    const bare = projection({ active: true, persona: 'asesor', subjectMemberId: null });
    assert.deepEqual(
      filterWorkForEvaluation(bare, [work({ workItemId: 'w1', ownerMemberId: 'mem_a' })], null),
      [],
    );
  });

  it('Asesor with subject keeps owned work only', () => {
    const rows = [
      work({ workItemId: 'w-a', ownerMemberId: 'mem_a' }),
      work({ workItemId: 'w-b', ownerMemberId: 'mem_b' }),
    ];
    assert.deepEqual(
      filterWorkForEvaluation(asesor, rows, new Set(['pty-a'])).map((r) => r.workItemId),
      ['w-a'],
    );
  });

  it('ops personas drop commercial owner rows', () => {
    const ops = projection({
      active: true,
      persona: 'produccion',
      commercialVisibility: null,
    });
    assert.deepEqual(
      filterCommercialOwnerRowsForEvaluation(
        ops,
        [{ id: '1', ownerMemberId: 'mem_a' }],
        (r) => r.ownerMemberId,
      ),
      [],
    );
  });

  it('ops commitments keep only work-relevant (no party)', () => {
    const ops = projection({ active: true, persona: 'almacen' });
    const rows: CommitmentSummary[] = [
      {
        id: 'c-party',
        organizationId: 'org-1',
        partyId: 'pty-1',
        ownerMemberId: 'mem-1',
        text: 'Cliente',
        dueAt: null,
        origin: 'manual',
        relatedSubjectType: null,
        relatedSubjectId: null,
        lifecycle: 'open',
        state: 'pending',
        createdByMemberId: 'mem-1',
        createdAt: '2026-09-01T00:00:00.000Z',
        fulfilledAt: null,
        fulfilledByMemberId: null,
        cancelledAt: null,
      },
      {
        id: 'c-team',
        organizationId: 'org-1',
        partyId: null,
        ownerMemberId: 'mem-1',
        text: 'Interno',
        dueAt: null,
        origin: 'manual',
        relatedSubjectType: null,
        relatedSubjectId: null,
        lifecycle: 'open',
        state: 'pending',
        createdByMemberId: 'mem-1',
        createdAt: '2026-09-01T00:00:00.000Z',
        fulfilledAt: null,
        fulfilledByMemberId: null,
        cancelledAt: null,
      },
    ];
    assert.deepEqual(
      filterCommitmentsForEvaluation(ops, rows, null).map((r) => r.id),
      ['c-team'],
    );
  });

  it('approvals desk denied for Asesor/ops; allowed for Jefe/Gerencia', () => {
    assert.equal(evaluationAllowsDesk(asesor, 'aprobaciones'), false);
    assert.equal(evaluationAllowsApprovalAuthority(asesor), false);
    assert.equal(
      evaluationAllowsDesk(
        projection({ active: true, persona: 'jefe-comercial', commercialVisibility: 'team' }),
        'aprobaciones',
      ),
      true,
    );
    assert.equal(
      filterApprovalsForEvaluation(asesor, [approval({ approvalRequestId: 'a1' })], {
        memberId: 'mem-1',
        scope: 'personal',
      }).length,
      0,
    );
  });
});

describe('inicio summary approvals lens consistency', () => {
  it('personal scope counts only pending-for-me (same as Decisiones)', () => {
    const counts = buildInicioSummaryCounts({
      attention: [],
      work: [],
      approvals: [
        approval({ approvalRequestId: 'mine', approverMemberId: 'mem-1' }),
        approval({ approvalRequestId: 'other', approverMemberId: 'mem-9' }),
      ],
      issues: [] as IssueListItem[],
      memberId: 'mem-1',
      approvalsScope: 'personal',
    });
    assert.equal(counts.approvals, 1);
    assert.deepEqual(
      filterPendingApprovalsForLens(
        [
          approval({ approvalRequestId: 'mine', approverMemberId: 'mem-1' }),
          approval({ approvalRequestId: 'other', approverMemberId: 'mem-9' }),
        ],
        'mem-1',
        'personal',
      ).map((r) => r.approvalRequestId),
      ['mine'],
    );
  });

  it('org scope counts all pending for Empresa lens', () => {
    const counts = buildInicioSummaryCounts({
      attention: [],
      work: [],
      approvals: [
        approval({ approvalRequestId: 'a', approverMemberId: 'mem-1' }),
        approval({ approvalRequestId: 'b', approverMemberId: 'mem-9' }),
      ],
      issues: [] as IssueListItem[],
      memberId: 'mem-1',
      approvalsScope: 'org',
    });
    assert.equal(counts.approvals, 2);
  });

  it('documents approvals card = pending where approverMemberId === memberId', () => {
    // Contract lock: summary-counts.ts documents this equality with Decisiones.
    const personal = filterPendingApprovalsForLens(
      [approval({ approvalRequestId: 'x', approverMemberId: 'mem-1' })],
      'mem-1',
      'personal',
    );
    assert.equal(personal.length, 1);
    assert.equal(personal[0]?.approverMemberId, 'mem-1');
  });
});
