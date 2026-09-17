/**
 * Vista de evaluación narrowing for Inicio queues.
 * Reuses evaluation-resource-access helpers — no page-local role invention.
 */
import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import type { IssueListItem } from '@/lib/issue/types';
import type { EvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  evaluationAllowsApprovalAuthority,
  evaluationIsOpsPersona,
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';

export type InicioApprovalsScope = 'personal' | 'org';

/**
 * Pending approvals for Decisiones / summary card.
 * personal = approverMemberId === memberId (same as summary-counts / Mi día).
 * org = all pending (Empresa lens only — caller gates management.org.read).
 */
export function filterPendingApprovalsForLens(
  items: readonly ApprovalSummaryReadModel[],
  memberId: string,
  scope: InicioApprovalsScope,
): ApprovalSummaryReadModel[] {
  return items.filter((row) => {
    if (row.status !== 'pending') return false;
    if (scope === 'org') return true;
    return row.approverMemberId === memberId;
  });
}

/** Asesor without subject → empty; Asesor with subject → owned parties only; else passthrough. */
export function filterByAllowedParties<T>(
  projection: EvaluationProjection,
  items: readonly T[],
  partyIdOf: (item: T) => string | null | undefined,
  allowedPartyIds: ReadonlySet<string> | null,
  opts?: { keepWithoutParty?: boolean },
): T[] {
  if (!projection.active) return [...items];
  if (projection.persona === 'asesor') {
    if (!projection.subjectMemberId || !allowedPartyIds) return [];
    const keepWithout = opts?.keepWithoutParty === true;
    return items.filter((item) => {
      const partyId = partyIdOf(item)?.trim();
      if (!partyId) return keepWithout;
      return allowedPartyIds.has(partyId);
    });
  }
  return [...items];
}

export function filterWorkForEvaluation(
  projection: EvaluationProjection,
  items: readonly WorkSummaryReadModel[],
  allowedPartyIds: ReadonlySet<string> | null,
): WorkSummaryReadModel[] {
  if (!projection.active) return [...items];
  if (projection.persona === 'asesor') {
    if (!projection.subjectMemberId) return [];
    return items.filter((row) => {
      if (row.ownerMemberId === projection.subjectMemberId) return true;
      if (row.subjectType === 'party' && row.subjectId && allowedPartyIds?.has(row.subjectId)) {
        return true;
      }
      return false;
    });
  }
  // Ops personas: keep work (work-relevant); commercial personas keep all in projection.
  return [...items];
}

export function filterAttentionForEvaluation(
  projection: EvaluationProjection,
  items: readonly AttentionItemReadModel[],
  allowedPartyIds: ReadonlySet<string> | null,
): AttentionItemReadModel[] {
  if (!projection.active) return [...items];
  if (projection.persona === 'asesor') {
    if (!projection.subjectMemberId) return [];
    return items.filter((row) => {
      if (row.memberId === projection.subjectMemberId) return true;
      if (row.subjectType === 'party' && row.subjectId && allowedPartyIds?.has(row.subjectId)) {
        return true;
      }
      return false;
    });
  }
  if (evaluationIsOpsPersona(projection.persona)) {
    // Ops: work attention only — not commercial approval inbox.
    return items.filter((row) => row.resourceType === 'work_item');
  }
  return [...items];
}

export function filterApprovalsForEvaluation(
  projection: EvaluationProjection,
  items: readonly ApprovalSummaryReadModel[],
  opts: { memberId: string; scope: InicioApprovalsScope },
): ApprovalSummaryReadModel[] {
  const scoped = filterPendingApprovalsForLens(items, opts.memberId, opts.scope);
  if (!projection.active) return scoped;
  if (!evaluationAllowsApprovalAuthority(projection)) return [];
  // Jefe/Gerencia: keep pending in projection (commercial-relevant via list API visibility).
  return scoped;
}

export function filterIssuesForEvaluation(
  projection: EvaluationProjection,
  items: readonly IssueListItem[],
  allowedPartyIds: ReadonlySet<string> | null,
): IssueListItem[] {
  if (!projection.active) return [...items];
  if (projection.persona === 'asesor') {
    if (!projection.subjectMemberId) return [];
    return items.filter((row) => {
      if (row.ownerMemberId === projection.subjectMemberId) return true;
      if (row.reporterMemberId === projection.subjectMemberId) return true;
      const partyRef = row.references?.find((ref) => ref.referenceType === 'party');
      if (partyRef && allowedPartyIds?.has(partyRef.referenceId)) return true;
      return false;
    });
  }
  // Ops: keep issues (work-relevant).
  return [...items];
}

export function filterCommitmentsForEvaluation(
  projection: EvaluationProjection,
  items: readonly CommitmentSummary[],
  allowedPartyIds: ReadonlySet<string> | null,
): CommitmentSummary[] {
  if (!projection.active) return [...items];
  if (projection.persona === 'asesor') {
    if (!projection.subjectMemberId) return [];
    const byOwner = filterByCommercialOwner(projection, items, (row) => row.ownerMemberId);
    if (!allowedPartyIds) return byOwner;
    return byOwner.filter((row) => !row.partyId || allowedPartyIds.has(row.partyId));
  }
  if (evaluationIsOpsPersona(projection.persona)) {
    // Work-relevant: internal/team commitments (no commercial party) stay; party-linked drop.
    return items.filter((row) => !row.partyId);
  }
  return [...items];
}

export function filterCommercialOwnerRowsForEvaluation<T>(
  projection: EvaluationProjection,
  items: readonly T[],
  ownerOf: (item: T) => string | null | undefined,
): T[] {
  if (!projection.active) return [...items];
  if (evaluationIsOpsPersona(projection.persona)) return [];
  return filterByCommercialOwner(projection, items, ownerOf);
}
