import type { ApprovalSummaryReadModel, AttentionItemReadModel } from '@isalwa/os-contracts';
import type { IssueListItem } from '@/lib/issue/types';
import { isDueToday } from '@/lib/work/aging/clock';
import { isWorkOverdue } from '@/lib/work/labels';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { InicioApprovalsScope } from '@/lib/inicio/filter-for-evaluation';
import { filterPendingApprovalsForLens } from '@/lib/inicio/filter-for-evaluation';

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

/**
 * Builds Inicio summary card counts.
 *
 * **Metric definitions (RC2 one-source-of-truth):**
 * - `needsAttention`: active attention rows + overdue open work owned by
 *   `workOwnerMemberId` (Asesor subject under View As; else session member).
 * - `forToday`: due-today (not overdue) work for that owner + pending approvals
 *   in the active approvals scope.
 * - `approvals`: pending approval count for the active scope — **must match**
 *   `/aprobaciones` and Decisiones for the same projection:
 *   - `personal` (default): `approverMemberId === memberId`
 *   - `org`: all pending (Empresa lens, or View As Jefe/Gerencia)
 * - `openIssues`: unresolved issues owned by workOwner (or unassigned).
 *
 * Never invent counts. Do not mix personal Decisiones with org Approvals desk.
 */
export function buildInicioSummaryCounts(input: {
  attention: readonly AttentionItemReadModel[];
  work: readonly WorkSummaryReadModel[];
  approvals: readonly ApprovalSummaryReadModel[];
  issues: readonly IssueListItem[];
  memberId: string;
  asOf?: Date;
  /** Defaults to personal (pending-for-me). Use org only for Empresa lens. */
  approvalsScope?: InicioApprovalsScope;
  /**
   * Owner used for personal work/issue card filters.
   * Under View As Asesor, pass the subject member id (projection only — identity stays Carmen).
   */
  workOwnerMemberId?: string;
}): InicioSummaryCounts {
  const asOf = input.asOf ?? new Date();
  const approvalsScope = input.approvalsScope ?? 'personal';
  const workOwnerId = input.workOwnerMemberId ?? input.memberId;
  const activeAttention = input.attention.filter((item) => item.isActive);

  const personalOpenWork = input.work.filter(
    (row) => row.status === 'open' && row.ownerMemberId === workOwnerId,
  );

  const dueTodayWork = personalOpenWork.filter(
    (row) => row.dueAt && isDueToday(row.dueAt, asOf) && !isWorkOverdue(row, asOf),
  ).length;

  const overdueWork = personalOpenWork.filter((row) => isWorkOverdue(row, asOf)).length;

  const pendingApprovals = filterPendingApprovalsForLens(
    input.approvals,
    input.memberId,
    approvalsScope,
  ).length;

  const openIssues = input.issues.filter(
    (row) =>
      row.status !== 'resolved' &&
      row.status !== 'closed' &&
      (row.ownerMemberId === workOwnerId || row.ownerMemberId == null),
  ).length;

  return {
    needsAttention: activeAttention.length + overdueWork,
    forToday: dueTodayWork + pendingApprovals,
    approvals: pendingApprovals,
    openIssues,
  };
}
