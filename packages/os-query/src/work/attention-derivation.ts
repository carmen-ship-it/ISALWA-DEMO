import type { AttentionType } from '@isalwa/os-contracts';
import type { StoredApprovalReadModel, StoredAttentionReadModel, StoredWorkReadModel } from '../projection-store-port';

export function deriveAttentionReadModels(
  organizationId: string,
  workItems: StoredWorkReadModel[],
  approvals: StoredApprovalReadModel[],
  asOf: Date,
): StoredAttentionReadModel[] {
  const items: StoredAttentionReadModel[] = [];
  const derivedAt = asOf;

  for (const work of workItems) {
    if (work.status === 'open') {
      items.push({
        attentionKey: `work:owner:${work.workItemId}`,
        organizationId,
        memberId: work.ownerMemberId,
        attentionType: 'open_work_assigned',
        reasonCode: 'work.open.owned',
        reasonDetail: {
          source: 'work_read_model',
          workItemId: work.workItemId,
          title: work.title,
          status: work.status,
        },
        resourceType: 'work_item',
        resourceId: work.workItemId,
        workItemId: work.workItemId,
        approvalRequestId: null,
        subjectType: work.subjectType,
        subjectId: work.subjectId,
        isActive: true,
        derivedAt,
        updatedAt: derivedAt,
      });

      if (work.lastReassignedAt) {
        items.push({
          attentionKey: `work:reassigned:${work.workItemId}`,
          organizationId,
          memberId: work.ownerMemberId,
          attentionType: 'reassigned_work',
          reasonCode: 'work.reassigned.to_you',
          reasonDetail: {
            source: 'ownership_history',
            workItemId: work.workItemId,
            reassignedAt: work.lastReassignedAt.toISOString(),
          },
          resourceType: 'work_item',
          resourceId: work.workItemId,
          workItemId: work.workItemId,
          approvalRequestId: null,
          subjectType: work.subjectType,
          subjectId: work.subjectId,
          isActive: true,
          derivedAt,
          updatedAt: derivedAt,
        });
      }

      if (work.dueAt && new Date(work.dueAt) < asOf) {
        items.push({
          attentionKey: `work:overdue:${work.workItemId}`,
          organizationId,
          memberId: work.ownerMemberId,
          attentionType: 'overdue_work',
          reasonCode: 'work.open.overdue',
          reasonDetail: {
            source: 'work_read_model',
            workItemId: work.workItemId,
            dueAt: work.dueAt,
          },
          resourceType: 'work_item',
          resourceId: work.workItemId,
          workItemId: work.workItemId,
          approvalRequestId: null,
          subjectType: work.subjectType,
          subjectId: work.subjectId,
          isActive: true,
          derivedAt,
          updatedAt: derivedAt,
        });
      }
    }
  }

  for (const approval of approvals) {
    if (approval.status !== 'pending') continue;
    items.push({
      attentionKey: `approval:approver:${approval.approvalRequestId}`,
      organizationId,
      memberId: approval.approverMemberId,
      attentionType: 'pending_approval' satisfies AttentionType,
      reasonCode: 'approval.pending.for_you',
      reasonDetail: {
        source: 'approval_read_model',
        approvalRequestId: approval.approvalRequestId,
        workItemId: approval.workItemId,
        subjectType: approval.subjectType,
        subjectId: approval.subjectId,
      },
      resourceType: 'approval_request',
      resourceId: approval.approvalRequestId,
      workItemId: approval.workItemId,
      approvalRequestId: approval.approvalRequestId,
      subjectType: approval.subjectType,
      subjectId: approval.subjectId,
      isActive: true,
      derivedAt,
      updatedAt: derivedAt,
    });
  }

  return items;
}
