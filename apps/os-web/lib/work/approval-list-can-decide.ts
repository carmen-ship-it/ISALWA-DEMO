import type { OsApiClient } from '@/lib/api/os-api-client';
import type { SubjectApprovalItem } from '@/lib/commercial/types';

/**
 * Same decide truth as approval detail: subject history canDecide, else assigned member.
 * Presentation only — does not broaden authority.
 */
export async function resolveApprovalListCanDecide(
  client: OsApiClient,
  approval: {
    approvalRequestId: string;
    subjectType: string;
    subjectId: string;
    status: string;
    approverMemberId: string;
  },
): Promise<boolean> {
  if (approval.status !== 'pending') return false;
  if (approval.subjectType === 'quote' || approval.subjectType === 'order') {
    try {
      const history = await client.listSubjectApprovals(approval.subjectType, approval.subjectId);
      const match = (history.items as SubjectApprovalItem[]).find(
        (item) => item.approvalRequestId === approval.approvalRequestId,
      );
      return match?.canDecide === true;
    } catch {
      return false;
    }
  }
  try {
    const session = await client.getAuthenticatedSession();
    return session.memberId === approval.approverMemberId;
  } catch {
    return false;
  }
}
