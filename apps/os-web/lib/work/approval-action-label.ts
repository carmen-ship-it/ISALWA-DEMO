/**
 * Permission-aware list CTA for approvals.
 * Mirrors server decide authority: assigned approver may decide; others inspect only.
 */

export type ApprovalListActionLabel = 'Decidir' | 'Ver solicitud' | 'Ver contexto' | 'Ver registro';

export function approvalListActionLabel(input: {
  status: string;
  approverMemberId: string;
  currentMemberId: string | null | undefined;
  evaluationMode?: boolean;
}): ApprovalListActionLabel {
  if (input.evaluationMode) return 'Ver contexto';
  if (input.status !== 'pending') return 'Ver registro';
  if (input.currentMemberId && input.approverMemberId === input.currentMemberId) {
    return 'Decidir';
  }
  return 'Ver solicitud';
}
