import { isApprovalSubjectType } from '@isalwa/os-contracts';
import type { OsWorkStore } from './os-work-store';

/**
 * Validates approval subject type + tenant ownership + existence.
 * Unknown types fail closed. Blocked types (e.g. commercial_account) are not in the enum.
 */
export async function validateApprovalSubject(
  store: OsWorkStore,
  organizationId: string,
  subjectType: string,
  subjectId: string,
): Promise<void> {
  if (!isApprovalSubjectType(subjectType)) {
    throw new Error('VALIDATION_FAILED');
  }

  switch (subjectType) {
    case 'party': {
      const ok = await store.partyExistsInOrg(organizationId, subjectId);
      if (!ok) throw new Error('NOT_FOUND');
      return;
    }
    case 'organization_member': {
      const member = await store.getMemberInOrg(organizationId, subjectId);
      if (!member || member.accessStatus !== 'active') throw new Error('NOT_FOUND');
      return;
    }
    case 'work_item': {
      const work = await store.getWorkItemInOrg(organizationId, subjectId);
      if (!work || work.status !== 'open') throw new Error('NOT_FOUND');
      return;
    }
    default:
      throw new Error('VALIDATION_FAILED');
  }
}

export function buildApprovalDecisionEventPayload(input: {
  approvalRequestId: string;
  subjectType: string;
  subjectId: string;
  requestedByMemberId: string;
  approverMemberId: string;
  decision: 'approved' | 'rejected';
  decisionByMemberId: string;
  decidedAt: Date;
  reason?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    approvalRequestId: input.approvalRequestId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    requestedByMemberId: input.requestedByMemberId,
    approverMemberId: input.approverMemberId,
    decision: input.decision,
    decisionByMemberId: input.decisionByMemberId,
    decidedAt: input.decidedAt.toISOString(),
  };
  if (input.reason) {
    payload.reason = input.reason.slice(0, 500);
  }
  return payload;
}
