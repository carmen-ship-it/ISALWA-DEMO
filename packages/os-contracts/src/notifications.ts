/**
 * Internal notice only. No email, no push, no provider.
 * One open notice per recipient and issue. Read and resolved are separate.
 * A notice resolves only when its source condition is gone.
 */

import { z } from 'zod';
import type { CommitmentState } from './commitments';

export const NOTIFICATION_CHANNEL = 'internal' as const;

export const NOTIFICATION_KINDS = [
  'approval_assigned',
  'approval_decided',
  'work_due',
  'work_overdue',
  'customer_attention',
  'commitment_due',
  'commitment_overdue',
  'responsibility_changed',
  'data_issue_review',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const COMMITMENT_NOTICE_KINDS = ['commitment_due', 'commitment_overdue'] as const;
export type CommitmentNoticeKind = (typeof COMMITMENT_NOTICE_KINDS)[number];

export const NOTIFICATION_READ_STATES = ['unread', 'read'] as const;
export type NotificationReadState = (typeof NOTIFICATION_READ_STATES)[number];

export const NOTIFICATION_RESOLUTIONS = ['open', 'resolved'] as const;
export type NotificationResolution = (typeof NOTIFICATION_RESOLUTIONS)[number];

/** Hosted records a notice may point at. A free URL is not a source. */
export const NOTIFICATION_SOURCE_TYPES = [
  'work_item',
  'approval_request',
  'party',
  'commitment',
  'quote',
  'order',
  'opportunity',
  'organization_member',
] as const;
export type NotificationSourceType = (typeof NOTIFICATION_SOURCE_TYPES)[number];

export const NOTIFICATION_PERSISTENCE_BLOCKER = 'schema_not_available' as const;

const IsoDateTime = z.string().datetime();

export const NotificationSourceSchema = z
  .object({
    recordType: z.enum(NOTIFICATION_SOURCE_TYPES),
    recordId: z.string().min(1),
    partyId: z.string().min(1).nullable(),
  })
  .strict();

export type NotificationSource = z.infer<typeof NotificationSourceSchema>;

export const InternalNotificationSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    recipientMemberId: z.string().min(1),
    kind: z.enum(NOTIFICATION_KINDS),
    dedupKey: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1).nullable(),
    source: NotificationSourceSchema,
    channel: z.literal(NOTIFICATION_CHANNEL),
    readAt: IsoDateTime.nullable(),
    resolvedAt: IsoDateTime.nullable(),
    resolvedBecause: z.literal('source_condition_gone').nullable(),
    createdAt: IsoDateTime,
  })
  .strict();

export type InternalNotification = z.infer<typeof InternalNotificationSchema>;

export type NotificationError =
  | 'id_required'
  | 'organization_required'
  | 'recipient_required'
  | 'title_required'
  | 'source_required'
  | 'invalid_time';

export type NotificationResult =
  | { ok: true; notification: InternalNotification }
  | { ok: false; reason: NotificationError };

export type AdmitResult =
  | { outcome: 'created'; notification: InternalNotification; inbox: InternalNotification[] }
  | { outcome: 'duplicate'; notification: InternalNotification; inbox: InternalNotification[] };

/** There is no outbound channel. */
export function notificationDeliversExternally(): false {
  return false;
}

export function notificationDedupKey(input: {
  kind: NotificationKind;
  recordType: NotificationSourceType;
  recordId: string;
}): string {
  return `${input.kind}:${input.recordType}:${input.recordId.trim()}`;
}

export function notificationReadState(notification: Pick<InternalNotification, 'readAt'>): NotificationReadState {
  return notification.readAt ? 'read' : 'unread';
}

export function notificationResolution(
  notification: Pick<InternalNotification, 'resolvedAt'>,
): NotificationResolution {
  return notification.resolvedAt ? 'resolved' : 'open';
}

export function notificationsInOrganization(
  items: readonly InternalNotification[],
  organizationId: string,
): InternalNotification[] {
  return items.filter((item) => item.organizationId === organizationId);
}

export function createInternalNotification(input: {
  id: string;
  organizationId: string;
  recipientMemberId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  source: { recordType: NotificationSourceType; recordId: string; partyId?: string | null };
  createdAt: string;
}): NotificationResult {
  const id = input.id.trim();
  const organizationId = input.organizationId.trim();
  const recipientMemberId = input.recipientMemberId.trim();
  const title = input.title.trim();
  const recordId = input.source.recordId.trim();
  if (!id) return { ok: false, reason: 'id_required' };
  if (!organizationId) return { ok: false, reason: 'organization_required' };
  if (!recipientMemberId) return { ok: false, reason: 'recipient_required' };
  if (!title) return { ok: false, reason: 'title_required' };
  if (!recordId) return { ok: false, reason: 'source_required' };
  const createdAt = IsoDateTime.safeParse(input.createdAt);
  if (!createdAt.success) return { ok: false, reason: 'invalid_time' };

  const source: NotificationSource = {
    recordType: input.source.recordType,
    recordId,
    partyId: input.source.partyId?.trim() || null,
  };
  const notification: InternalNotification = {
    id,
    organizationId,
    recipientMemberId,
    kind: input.kind,
    dedupKey: notificationDedupKey({
      kind: input.kind,
      recordType: source.recordType,
      recordId: source.recordId,
    }),
    title,
    body: input.body?.trim() || null,
    source,
    channel: NOTIFICATION_CHANNEL,
    readAt: null,
    resolvedAt: null,
    resolvedBecause: null,
    createdAt: createdAt.data,
  };
  return { ok: true, notification };
}

/**
 * An unresolved notice with the same recipient and issue is kept.
 * Read state is not reopened. A resolved notice does not block a later one.
 */
export function admitNotification(
  inbox: readonly InternalNotification[],
  candidate: InternalNotification,
): AdmitResult {
  const existing = inbox.find(
    (item) =>
      item.resolvedAt === null &&
      item.organizationId === candidate.organizationId &&
      item.recipientMemberId === candidate.recipientMemberId &&
      item.dedupKey === candidate.dedupKey,
  );
  if (existing) {
    return { outcome: 'duplicate', notification: existing, inbox: [...inbox] };
  }
  return { outcome: 'created', notification: candidate, inbox: [...inbox, candidate] };
}

export function markNotificationRead(
  notification: InternalNotification,
  readAt: string,
): NotificationResult {
  if (notification.readAt) return { ok: true, notification };
  const parsed = IsoDateTime.safeParse(readAt);
  if (!parsed.success) return { ok: false, reason: 'invalid_time' };
  return { ok: true, notification: { ...notification, readAt: parsed.data } };
}

/**
 * Resolves only when the caller reports the source condition is gone.
 * Does not mark the notice read and does not invent another resolution reason.
 */
export function resolveIfSourceConditionGone(
  notification: InternalNotification,
  sourceConditionPresent: boolean,
  at: string,
): NotificationResult {
  if (sourceConditionPresent || notification.resolvedAt) {
    return { ok: true, notification };
  }
  const parsed = IsoDateTime.safeParse(at);
  if (!parsed.success) return { ok: false, reason: 'invalid_time' };
  return {
    ok: true,
    notification: {
      ...notification,
      resolvedAt: parsed.data,
      resolvedBecause: 'source_condition_gone',
    },
  };
}

export function commitmentNoticeKind(state: CommitmentState): CommitmentNoticeKind | null {
  if (state === 'due_today') return 'commitment_due';
  if (state === 'overdue') return 'commitment_overdue';
  return null;
}

export function commitmentNoticeStillApplies(
  state: CommitmentState,
  kind: CommitmentNoticeKind,
): boolean {
  return commitmentNoticeKind(state) === kind;
}

/** Closes commitment notices whose day-state no longer matches. Does not create a replacement. */
export function resolveGoneCommitmentNotices(
  inbox: readonly InternalNotification[],
  input: { commitmentId: string; state: CommitmentState; at: string },
): { ok: true; inbox: InternalNotification[] } | { ok: false; reason: 'invalid_time' } {
  const commitmentId = input.commitmentId.trim();
  let changed = false;
  const next: InternalNotification[] = [];
  for (const item of inbox) {
    const isCommitmentNotice =
      item.source.recordType === 'commitment' &&
      item.source.recordId === commitmentId &&
      (item.kind === 'commitment_due' || item.kind === 'commitment_overdue') &&
      item.resolvedAt === null &&
      !commitmentNoticeStillApplies(input.state, item.kind);
    if (!isCommitmentNotice) {
      next.push(item);
      continue;
    }
    const resolved = resolveIfSourceConditionGone(item, false, input.at);
    if (!resolved.ok) return { ok: false, reason: 'invalid_time' };
    changed = true;
    next.push(resolved.notification);
  }
  return { ok: true, inbox: changed ? next : [...inbox] };
}
