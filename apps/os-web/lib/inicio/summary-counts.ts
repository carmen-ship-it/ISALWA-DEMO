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
 * **Approvals card** (`approvals`) must match Decisiones / Mi día:
 * - `approvalsScope: 'personal'` (default): pending where
 *   `approverMemberId === memberId` — same filter Decisiones uses on the
 *   personal Centro de mando list.
 * - `approvalsScope: 'org'`: all pending — Empresa (org) page lens only when
 *   the viewer has `management.org.read` (caller gates). Never use org scope
 *   for the personal Decisiones list.
 *
 * Align the card with the active page lens (`personal` | `team` | `org`):
 * personal/team → personal pending-for-me; org → org pending when authorized.
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
