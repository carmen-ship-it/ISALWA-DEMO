import type { AttentionType } from '@isalwa/os-contracts';
import type { StoredApprovalReadModel, StoredAttentionReadModel, StoredWorkReadModel } from '../projection-store-port';

/** Existing overdue key. Clock refresh and event rebuild must share it so rows do not duplicate. */
export function overdueAttentionKey(workItemId: string): string {
  return `work:overdue:${workItemId}`;
}

/**
 * Existing overdue rule: open work with dueAt strictly before asOf.
 * Equality is not overdue. Null dueAt is not overdue. Closed work is not overdue.
 */
export function isOpenWorkPastDue(
  work: { status: string; dueAt: string | null },
  asOf: Date,
): boolean {
  if (work.status !== 'open' || !work.dueAt) return false;
  return new Date(work.dueAt) < asOf;
}

export type OverdueRefreshCandidateWork = {
  organizationId: string;
  workItemId: string;
  status: string;
  dueAt: string | null;
};

export type OverdueRefreshCandidateAttention = {
  organizationId: string;
  workItemId: string | null;
  attentionKey: string;
  attentionType: string;
  isActive: boolean;
};

function overduePair(organizationId: string, workItemId: string): string {
  return `${organizationId}\0${workItemId}`;
}

/**
 * Organizations whose stored attention disagrees with the existing dueAt rule.
 * Adds missing overdue rows and clears overdue rows that no longer apply.
 * Does not cross tenants: a pair is organizationId + workItemId.
 */
export function organizationIdsNeedingOverdueRefresh(
  workItems: readonly OverdueRefreshCandidateWork[],
  attention: readonly OverdueRefreshCandidateAttention[],
  asOf: Date,
): string[] {
  const pastDue = new Set<string>();
  for (const work of workItems) {
    if (!isOpenWorkPastDue(work, asOf)) continue;
    pastDue.add(overduePair(work.organizationId, work.workItemId));
  }

  const overduePresent = new Set<string>();
  for (const item of attention) {
    if (item.attentionType !== 'overdue_work' || !item.isActive || !item.workItemId) continue;
    if (item.attentionKey !== overdueAttentionKey(item.workItemId)) continue;
    overduePresent.add(overduePair(item.organizationId, item.workItemId));
  }

  const organizations = new Set<string>();
  for (const pair of pastDue) {
    if (!overduePresent.has(pair)) organizations.add(pair.slice(0, pair.indexOf('\0')));
  }
  for (const pair of overduePresent) {
    if (!pastDue.has(pair)) organizations.add(pair.slice(0, pair.indexOf('\0')));
  }
  return [...organizations];
}

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

      if (isOpenWorkPastDue(work, asOf)) {
        items.push({
          attentionKey: overdueAttentionKey(work.workItemId),
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
