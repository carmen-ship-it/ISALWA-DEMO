import type { ApprovalSummaryReadModel, AttentionItemReadModel } from '@isalwa/os-contracts';
import type { IssueListItem } from '@/lib/issue/types';
import { isDueToday } from '@/lib/work/aging/clock';
import { isWorkOverdue } from '@/lib/work/labels';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';

export type InicioSummaryCounts = {
  needsAttention: number;
  forToday: number;
  approvals: number;
  openIssues: number;
};

export type InicioSummaryLinks = {
  needsAttention: string;
  forToday: string;
  approvals: string;
  openIssues: string;
};

export const INICIO_SUMMARY_LINKS: InicioSummaryLinks = {
  needsAttention: '/trabajo?view=overdue',
  forToday: '/trabajo',
  approvals: '/aprobaciones',
  openIssues: '/incidencias',
};

export function buildInicioSummaryCounts(input: {
  attention: readonly AttentionItemReadModel[];
  work: readonly WorkSummaryReadModel[];
  approvals: readonly ApprovalSummaryReadModel[];
  issues: readonly IssueListItem[];
  memberId: string;
  asOf?: Date;
}): InicioSummaryCounts {
  const asOf = input.asOf ?? new Date();
  const activeAttention = input.attention.filter((item) => item.isActive);

  const personalOpenWork = input.work.filter(
    (row) => row.status === 'open' && row.ownerMemberId === input.memberId,
  );

  const dueTodayWork = personalOpenWork.filter(
    (row) => row.dueAt && isDueToday(row.dueAt, asOf) && !isWorkOverdue(row, asOf),
  ).length;

  const overdueWork = personalOpenWork.filter((row) => isWorkOverdue(row, asOf)).length;

  const pendingApprovals = input.approvals.filter(
    (row) => row.status === 'pending' && row.approverMemberId === input.memberId,
  ).length;

  const openIssues = input.issues.filter(
    (row) =>
      row.status !== 'resolved' &&
      row.status !== 'closed' &&
      (row.ownerMemberId === input.memberId || row.ownerMemberId == null),
  ).length;

  return {
    needsAttention: activeAttention.length + overdueWork,
    forToday: dueTodayWork + pendingApprovals,
    approvals: pendingApprovals,
    openIssues,
  };
}
