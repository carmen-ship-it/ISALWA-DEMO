import type {
  ApprovalSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import type { IssueListItem } from '@/lib/issue/types';
import type { InicioRoleLens } from '@/lib/inicio/role-lens';
import { INICIO_COMMAND_QUEUE_LIMIT } from '@/lib/inicio/limits';
import { isWorkOverdue } from '@/lib/work/labels';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

export type InicioWorkItemsQuery = {
  status: 'open';
  limit: number;
  visibility?: 'team' | 'org';
  overdue?: boolean;
};

export type InicioIssuesQuery = {
  view: 'open';
  limit: number;
};

export type InicioCommitmentsQuery =
  | { lifecycle: 'open'; ownerMemberId: string }
  | { lifecycle: 'open' };

export function workItemsQueryForLens(lens: InicioRoleLens): InicioWorkItemsQuery {
  const base = { status: 'open' as const, limit: INICIO_COMMAND_QUEUE_LIMIT };
  if (lens === 'owner') return { ...base, visibility: 'org' };
  if (lens === 'manager') return { ...base, visibility: 'team' };
  return base;
}

export function issuesQueryForLens(_lens: InicioRoleLens): InicioIssuesQuery {
  return { view: 'open', limit: INICIO_COMMAND_QUEUE_LIMIT };
}

export function commitmentsQueryForLens(
  lens: InicioRoleLens,
  ownerMemberId: string,
): InicioCommitmentsQuery {
  if (lens === 'operator') {
    return { lifecycle: 'open', ownerMemberId };
  }
  return { lifecycle: 'open' };
}

export function filterVisibleWorkItems(
  items: readonly WorkSummaryReadModel[],
  asOf: Date,
): WorkSummaryReadModel[] {
  return items
    .filter(
      (work) =>
        work.status === 'open' &&
        !isEngineeringFixtureCopy(work.title) &&
        !isEngineeringFixtureCopy(work.description),
    )
    .sort((left, right) => {
      const leftOverdue = isWorkOverdue(left, asOf) ? 0 : 1;
      const rightOverdue = isWorkOverdue(right, asOf) ? 0 : 1;
      if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;
      const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.POSITIVE_INFINITY;
      if (leftDue !== rightDue) return leftDue - rightDue;
      return left.workItemId.localeCompare(right.workItemId);
    })
    .slice(0, INICIO_COMMAND_QUEUE_LIMIT);
}

export function filterVisibleIssues(items: readonly IssueListItem[]): IssueListItem[] {
  return items
    .filter((item) => !isEngineeringFixtureCopy(item.description))
    .slice(0, INICIO_COMMAND_QUEUE_LIMIT);
}

export function splitCommitmentQueues(items: readonly CommitmentSummary[]): {
  overdue: CommitmentSummary[];
  open: CommitmentSummary[];
} {
  const visible = items
    .filter((item) => item.lifecycle === 'open' && !isEngineeringFixtureCopy(item.text))
    .sort((left, right) => {
      const rank = (state: CommitmentSummary['state']) => {
        if (state === 'overdue') return 0;
        if (state === 'due_today') return 1;
        if (state === 'pending') return 2;
        return 3;
      };
      const delta = rank(left.state) - rank(right.state);
      if (delta !== 0) return delta;
      return left.id.localeCompare(right.id);
    });

  const overdue = visible.filter((item) => item.state === 'overdue').slice(0, INICIO_COMMAND_QUEUE_LIMIT);
  const open = visible
    .filter((item) => item.state !== 'overdue')
    .slice(0, INICIO_COMMAND_QUEUE_LIMIT);
  return { overdue, open };
}

/**
 * Pending approvals for Inicio Decisiones (personal Centro de mando).
 * When `forMemberId` is set, keeps only pending-for-me — same rule as the
 * summary Approvals card (`approverMemberId === memberId`).
 * Omit `forMemberId` only for org-wide pending (Empresa metrics), never for Decisiones.
 */
export function filterPendingApprovals(
  items: readonly ApprovalSummaryReadModel[],
  opts?: { forMemberId?: string },
): ApprovalSummaryReadModel[] {
  return items
    .filter((item) => item.status === 'pending')
    .filter((item) => !opts?.forMemberId || item.approverMemberId === opts.forMemberId)
    .slice(0, INICIO_COMMAND_QUEUE_LIMIT);
}
