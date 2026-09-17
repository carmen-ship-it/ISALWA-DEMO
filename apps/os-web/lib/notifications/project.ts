import {
  createInternalNotification,
  type AttentionItemReadModel,
  type InternalNotification,
  type NotificationKind,
  type WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import { attentionHeadline, isWorkOverdue } from '@/lib/work/labels';
import { dueSoonLabel, workDueSoonVisual } from '@/lib/notifications/due-soon';
import { notificationKindFromAttention } from '@/lib/notifications/sources';

export type NotificationProjectionInput = {
  organizationId: string;
  recipientMemberId: string;
  attention: readonly AttentionItemReadModel[];
  work?: readonly WorkSummaryReadModel[];
  asOf?: Date;
  /** Client overlay until persistence is wired — does not complete Work. */
  localReadAt?: ReadonlyMap<string, string>;
};

function partyIdFromAttention(item: AttentionItemReadModel): string | null {
  if (item.subjectType === 'party' && item.subjectId?.trim()) return item.subjectId.trim();
  return null;
}

function workById(work: readonly WorkSummaryReadModel[] | undefined): Map<string, WorkSummaryReadModel> {
  const map = new Map<string, WorkSummaryReadModel>();
  for (const row of work ?? []) map.set(row.workItemId, row);
  return map;
}

function readDueAt(item: AttentionItemReadModel): string | null {
  const due = item.reasonDetail.dueAt;
  return typeof due === 'string' && due.trim() ? due.trim() : null;
}

function notificationBody(
  kind: NotificationKind,
  context: string | null,
  dueLine: string | null,
): string | null {
  const parts = [context, dueLine].filter((part): part is string => Boolean(part?.trim()));
  if (parts.length === 0) {
    if (kind === 'approval_assigned') return 'Requiere su revisión.';
    return null;
  }
  return parts.join(' · ');
}

function projectAttentionRow(
  item: AttentionItemReadModel,
  input: NotificationProjectionInput,
  workMap: Map<string, WorkSummaryReadModel>,
): InternalNotification | null {
  if (!item.isActive || item.organizationId !== input.organizationId) return null;
  if (item.memberId !== input.recipientMemberId) return null;

  const kind = notificationKindFromAttention(item.attentionType);
  if (!kind) return null;

  const asOf = input.asOf ?? new Date();
  const workItemId = item.workItemId ?? item.resourceId;
  const linkedWork = workItemId ? workMap.get(workItemId) : undefined;
  const dueAt = linkedWork?.dueAt ?? readDueAt(item);
  const visual =
    kind === 'work_overdue'
      ? 'past_due'
      : linkedWork
        ? workDueSoonVisual(linkedWork, asOf)
        : workDueSoonVisual({ status: 'open', dueAt }, asOf);
  const dueLine = dueSoonLabel(visual);

  let recordType: 'work_item' | 'approval_request' = 'work_item';
  let recordId = workItemId;
  if (item.resourceType === 'approval_request' && item.approvalRequestId) {
    recordType = 'approval_request';
    recordId = item.approvalRequestId;
  }
  if (!recordId?.trim()) return null;

  const title = attentionHeadline(item);
  const context =
    typeof item.reasonDetail.quoteNumber === 'string'
      ? item.reasonDetail.quoteNumber.trim()
      : typeof item.reasonDetail.orderNumber === 'string'
        ? item.reasonDetail.orderNumber.trim()
        : null;

  const created = createInternalNotification({
    id: `proj:${item.attentionKey}`,
    organizationId: input.organizationId,
    recipientMemberId: input.recipientMemberId,
    kind,
    title,
    body: notificationBody(kind, context, dueLine),
    source: {
      recordType,
      recordId: recordId.trim(),
      partyId: partyIdFromAttention(item),
    },
    createdAt: asOf.toISOString(),
  });
  if (!created.ok) return null;

  const readAt = input.localReadAt?.get(created.notification.id) ?? null;
  if (!readAt) return created.notification;
  return { ...created.notification, readAt };
}

/** Open work due within 24h without an overdue attention row yet. */
function projectDueSoonWork(
  input: NotificationProjectionInput,
  workMap: Map<string, WorkSummaryReadModel>,
  coveredWorkIds: Set<string>,
): InternalNotification[] {
  const asOf = input.asOf ?? new Date();
  const out: InternalNotification[] = [];
  for (const row of input.work ?? []) {
    if (row.organizationId !== input.organizationId) continue;
    if (row.ownerMemberId !== input.recipientMemberId) continue;
    if (row.status !== 'open') continue;
    if (coveredWorkIds.has(row.workItemId)) continue;
    if (isWorkOverdue(row, asOf)) continue;
    const visual = workDueSoonVisual(row, asOf);
    if (visual !== 'due_soon' && visual !== 'due_soon_urgent' && visual !== 'due_now') continue;

    const created = createInternalNotification({
      id: `proj:work-due:${row.workItemId}`,
      organizationId: input.organizationId,
      recipientMemberId: input.recipientMemberId,
      kind: 'work_due',
      title: row.title.trim() || 'Trabajo para hoy',
      body: dueSoonLabel(visual),
      source: {
        recordType: 'work_item',
        recordId: row.workItemId,
        partyId: row.subjectType === 'party' && row.subjectId ? row.subjectId : null,
      },
      createdAt: asOf.toISOString(),
    });
    if (!created.ok) continue;
    const readAt = input.localReadAt?.get(created.notification.id) ?? null;
    out.push(readAt ? { ...created.notification, readAt } : created.notification);
  }
  return out;
}

/** In-product inbox from Attention + Work read models only. */
export function projectInboxFromAttention(input: NotificationProjectionInput): InternalNotification[] {
  const workMap = workById(input.work);
  const fromAttention: InternalNotification[] = [];
  const coveredWork = new Set<string>();

  for (const item of input.attention) {
    const row = projectAttentionRow(item, input, workMap);
    if (!row) continue;
    fromAttention.push(row);
    if (row.source.recordType === 'work_item') coveredWork.add(row.source.recordId);
  }

  const dueSoon = projectDueSoonWork(input, workMap, coveredWork);
  return [...fromAttention, ...dueSoon];
}
