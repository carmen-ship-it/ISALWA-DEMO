import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import type { IssueListItem } from '@/lib/issue/types';
import { isDueToday } from '@/lib/work/aging/clock';
import { formatWorkDueLine, sortOpenWorkByDue } from '@/lib/work/due-order';
import { isWorkOverdue } from '@/lib/work/labels';
import { approvalHref, workItemHref } from '@/lib/work/navigation';
import { isEngineeringFixtureCopy, staffFacingSubject } from '@/lib/work/staff-subject';
import { partyHref } from '@/lib/party/navigation';

/**
 * Operating-day queue for the logged-in member.
 * Composes only governed facts: WorkItem dueAt, attention, approvals, commitments, issues.
 * No invented KPIs, SLAs, or AI ranking.
 */

export const TODAY_QUEUE_BUCKET_ORDER = [
  'overdue',
  'due_today',
  'pending_approvals',
  'next_actions',
  'commitments',
  'issues',
] as const;

export type TodayQueueBucketId = (typeof TODAY_QUEUE_BUCKET_ORDER)[number];

export type TodayQueueItem = {
  id: string;
  bucket: TodayQueueBucketId;
  title: string;
  href: string;
  dueAt: string | null;
  meta: string | null;
  overdue: boolean;
};

export type TodayQueueBucket = {
  id: TodayQueueBucketId;
  title: string;
  items: TodayQueueItem[];
};

export type TodayQueue = {
  asOf: string;
  buckets: TodayQueueBucket[];
  empty: boolean;
  /** Deterministic next action from open work with a stored dueAt, if any. */
  nextAction: TodayQueueItem | null;
};

export const TODAY_QUEUE_COPY = {
  kicker: 'Para hoy',
  title: 'Para hoy',
  description:
    'Trabajo, aprobaciones, incidencias y compromisos con fecha o responsable. El recordatorio es esta cola en el producto — no correo, push ni WhatsApp.',
  empty: 'No tienes pendientes para hoy.',
  nextAction: '¿Qué hago ahora?',
  overdue: 'Vencidos',
  dueToday: 'Vence hoy',
  pendingApprovals: 'Aprobaciones pendientes para mí',
  nextActions: 'Próximas acciones con fecha',
  commitments: 'Compromisos sin resolver',
  issues: 'Incidencias abiertas',
  viewWork: 'Ver trabajo',
  viewIssues: 'Ver incidencias',
} as const;

const BUCKET_TITLE: Record<TodayQueueBucketId, string> = {
  overdue: TODAY_QUEUE_COPY.overdue,
  due_today: TODAY_QUEUE_COPY.dueToday,
  pending_approvals: TODAY_QUEUE_COPY.pendingApprovals,
  next_actions: TODAY_QUEUE_COPY.nextActions,
  commitments: TODAY_QUEUE_COPY.commitments,
  issues: TODAY_QUEUE_COPY.issues,
};

export type TodayQueueInput = {
  memberId: string;
  asOf?: Date;
  attention?: readonly AttentionItemReadModel[];
  work?: readonly WorkSummaryReadModel[];
  approvals?: readonly ApprovalSummaryReadModel[];
  commitments?: readonly CommitmentSummary[];
  issues?: readonly IssueListItem[];
  partyLabels?: ReadonlyMap<string, string>;
  approvalSubjects?: ReadonlyMap<string, string>;
};

function workTitle(
  work: WorkSummaryReadModel,
  partyLabels: ReadonlyMap<string, string> | undefined,
): string {
  const customer =
    work.subjectType === 'party' && work.subjectId
      ? partyLabels?.get(work.subjectId) ?? null
      : null;
  return staffFacingSubject({
    title: work.title,
    description: work.description,
    subjectType: work.subjectType,
    customerName: customer && customer !== 'Cliente' ? customer : null,
  });
}

function visibleWork(items: readonly WorkSummaryReadModel[]): WorkSummaryReadModel[] {
  return items.filter(
    (work) =>
      work.status === 'open' &&
      !isEngineeringFixtureCopy(work.title) &&
      !isEngineeringFixtureCopy(work.description),
  );
}

/**
 * Build the member's today queue from already-authorized reads.
 * Approvals must already be scoped to the actor (approver / attention).
 * Does not expand visibility via people.admin.
 */
export function buildTodayQueue(input: TodayQueueInput): TodayQueue {
  const asOf = input.asOf ?? new Date();
  const partyLabels = input.partyLabels;
  const work = visibleWork(input.work ?? []);
  const seenWork = new Set<string>();

  const overdueItems: TodayQueueItem[] = [];
  const dueTodayItems: TodayQueueItem[] = [];
  const nextActionItems: TodayQueueItem[] = [];

  for (const item of input.attention ?? []) {
    if (!item.isActive || item.attentionType !== 'overdue_work' || !item.workItemId) continue;
    const match = work.find((row) => row.workItemId === item.workItemId);
    if (!match) continue;
    seenWork.add(match.workItemId);
    const due = formatWorkDueLine(match, { asOf });
    overdueItems.push({
      id: `attention:${item.attentionKey}`,
      bucket: 'overdue',
      title: workTitle(match, partyLabels),
      href: workItemHref(match.workItemId),
      dueAt: match.dueAt,
      meta: due.text,
      overdue: true,
    });
  }

  for (const match of sortOpenWorkByDue(work, asOf)) {
    if (seenWork.has(match.workItemId)) continue;
    if (isWorkOverdue(match, asOf)) {
      seenWork.add(match.workItemId);
      const due = formatWorkDueLine(match, { asOf });
      overdueItems.push({
        id: `work:${match.workItemId}`,
        bucket: 'overdue',
        title: workTitle(match, partyLabels),
        href: workItemHref(match.workItemId),
        dueAt: match.dueAt,
        meta: due.text,
        overdue: true,
      });
      continue;
    }
    if (isDueToday(match.dueAt, asOf)) {
      seenWork.add(match.workItemId);
      const due = formatWorkDueLine(match, { asOf });
      dueTodayItems.push({
        id: `work:${match.workItemId}`,
        bucket: 'due_today',
        title: workTitle(match, partyLabels),
        href: workItemHref(match.workItemId),
        dueAt: match.dueAt,
        meta: due.text,
        overdue: false,
      });
      continue;
    }
    if (match.dueAt) {
      seenWork.add(match.workItemId);
      const due = formatWorkDueLine(match, { asOf });
      nextActionItems.push({
        id: `work:${match.workItemId}`,
        bucket: 'next_actions',
        title: workTitle(match, partyLabels),
        href: workItemHref(match.workItemId),
        dueAt: match.dueAt,
        meta: due.text,
        overdue: false,
      });
    }
  }

  const pendingApprovals: TodayQueueItem[] = (input.approvals ?? [])
    .filter((row) => row.status === 'pending' && row.approverMemberId === input.memberId)
    .map((row) => ({
      id: `approval:${row.approvalRequestId}`,
      bucket: 'pending_approvals' as const,
      title:
        input.approvalSubjects?.get(row.approvalRequestId)?.trim() ||
        `Aprobación · ${row.subjectType}`,
      href: approvalHref(row.approvalRequestId),
      dueAt: null,
      meta: null,
      overdue: false,
    }));

  const commitments: TodayQueueItem[] = (input.commitments ?? [])
    .filter(
      (row) =>
        row.lifecycle === 'open' &&
        (row.state === 'overdue' || row.state === 'due_today') &&
        !isEngineeringFixtureCopy(row.text) &&
        (row.ownerMemberId === input.memberId || !row.ownerMemberId),
    )
    .map((row) => ({
      id: `commitment:${row.id}`,
      bucket: 'commitments' as const,
      title: row.text,
      href: row.partyId ? partyHref(row.partyId) : '/inicio',
      dueAt: row.dueAt,
      meta: row.state === 'overdue' ? 'Vencido' : 'Vence hoy',
      overdue: row.state === 'overdue',
    }));

  const issues: TodayQueueItem[] = (input.issues ?? [])
    .filter(
      (row) =>
        row.status !== 'resolved' &&
        row.status !== 'closed' &&
        !isEngineeringFixtureCopy(row.description) &&
        !isEngineeringFixtureCopy(row.title ?? '') &&
        (row.ownerMemberId === input.memberId || row.ownerMemberId == null),
    )
    .slice(0, 20)
    .map((row) => ({
      id: `issue:${row.issueId}`,
      bucket: 'issues' as const,
      title: (row.title?.trim() || row.description.trim() || 'Incidencia abierta'),
      href: `/incidencias/${row.issueId}`,
      dueAt: null,
      meta: null,
      overdue: false,
    }));

  const byBucket: Record<TodayQueueBucketId, TodayQueueItem[]> = {
    overdue: overdueItems,
    due_today: dueTodayItems,
    pending_approvals: pendingApprovals,
    next_actions: nextActionItems,
    commitments,
    issues,
  };

  const buckets = TODAY_QUEUE_BUCKET_ORDER.map((id) => ({
    id,
    title: BUCKET_TITLE[id],
    items: byBucket[id],
  })).filter((bucket) => bucket.items.length > 0);

  const nextAction =
    overdueItems[0] ?? dueTodayItems[0] ?? nextActionItems[0] ?? pendingApprovals[0] ?? null;

  return {
    asOf: asOf.toISOString(),
    buckets,
    empty: buckets.length === 0,
    nextAction,
  };
}
