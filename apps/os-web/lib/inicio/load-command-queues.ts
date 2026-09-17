import type { ApprovalSummaryReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { CommitmentSummary, OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import type { IssueListItem } from '@/lib/issue/types';
import {
  commitmentsQueryForLens,
  filterPendingApprovals,
  filterVisibleIssues,
  filterVisibleWorkItems,
  issuesQueryForLens,
  splitCommitmentQueues,
  workItemsQueryForLens,
} from '@/lib/inicio/queues';
import { resolveInicioRoleLens, type InicioRoleLens } from '@/lib/inicio/role-lens';
import { isVisibilityDenied } from '@/lib/leadership/load-inicio-leadership';

export type InicioCommandQueues = {
  lens: InicioRoleLens;
  pendingWork: WorkSummaryReadModel[];
  openIssues: IssueListItem[];
  commitmentsOverdue: CommitmentSummary[];
  commitmentsOpen: CommitmentSummary[];
  /** Decisiones / personal summary — pending where approver is the session member. */
  pendingApprovals: ApprovalSummaryReadModel[];
  /** Empresa lens metrics — all pending (not Decisiones). */
  pendingApprovalsOrg: ApprovalSummaryReadModel[];
  unavailable: {
    work: boolean;
    issues: boolean;
    commitments: boolean;
    approvals: boolean;
  };
};

type Safe<T> = T | 'unavailable';

/**
 * Optional Inicio section load. Forbidden/unauthorized omit the section
 * (same as leadership `isVisibilityDenied`). Layout still fail-closes OS
 * access; a 403 on one queue must not blank the home.
 */
export async function safeInicioSectionFetch<T>(fn: () => Promise<T>): Promise<Safe<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'unavailable') return 'unavailable';
    if (isVisibilityDenied(err)) return 'unavailable';
    throw err;
  }
}

export type LoadInicioCommandQueuesInput = {
  leadershipTeamReady: boolean;
  leadershipOrgReady: boolean;
};

export async function loadInicioCommandQueues(
  client: Pick<
    OsApiClient,
    | 'listWorkItems'
    | 'listIssues'
    | 'listCommitments'
    | 'listApprovals'
    | 'getAuthenticatedSession'
  >,
  input: LoadInicioCommandQueuesInput,
): Promise<InicioCommandQueues> {
  const roleKeys = await loadActorRoleKeys(client as OsApiClient);
  const lens = resolveInicioRoleLens({
    roleKeys,
    leadershipTeamReady: input.leadershipTeamReady,
    leadershipOrgReady: input.leadershipOrgReady,
  });
  const session = await client.getAuthenticatedSession();
  const asOf = new Date();

  const [workResult, issuesResult, commitmentsResult, approvalsResult] = await Promise.all([
    safeInicioSectionFetch(() => client.listWorkItems(workItemsQueryForLens(lens))),
    safeInicioSectionFetch(() => client.listIssues(issuesQueryForLens(lens))),
    safeInicioSectionFetch(() => client.listCommitments(commitmentsQueryForLens(lens, session.memberId))),
    safeInicioSectionFetch(() => client.listApprovals({ limit: 50 })),
  ]);

  const workItems =
    workResult === 'unavailable' ? [] : filterVisibleWorkItems(workResult.items, asOf);
  const issues =
    issuesResult === 'unavailable' ? [] : filterVisibleIssues(issuesResult.items as IssueListItem[]);
  const commitments =
    commitmentsResult === 'unavailable' ? [] : commitmentsResult.items;
  const { overdue: commitmentsOverdue, open: commitmentsOpen } = splitCommitmentQueues(commitments);
  // Decisiones on personal Centro de mando = pending-for-me (same as summary Approvals card).
  const pendingApprovals =
    approvalsResult === 'unavailable'
      ? []
      : filterPendingApprovals(approvalsResult.items, { forMemberId: session.memberId });
  const pendingApprovalsOrg =
    approvalsResult === 'unavailable' ? [] : filterPendingApprovals(approvalsResult.items);

  return {
    lens,
    pendingWork: workItems,
    openIssues: issues,
    commitmentsOverdue,
    commitmentsOpen,
    pendingApprovals,
    pendingApprovalsOrg,
    unavailable: {
      work: workResult === 'unavailable',
      issues: issuesResult === 'unavailable',
      commitments: commitmentsResult === 'unavailable',
      approvals: approvalsResult === 'unavailable',
    },
  };
}
