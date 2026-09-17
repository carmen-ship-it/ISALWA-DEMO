import type { AttentionType } from '@isalwa/os-contracts';
import type { NotificationKind } from '@isalwa/os-contracts';

/** V1 automatic categories with evidence — no free-form notices. */
export const NOTIFICATION_ATTENTION_KIND: Partial<Record<AttentionType, NotificationKind>> = {
  open_work_assigned: 'work_due',
  overdue_work: 'work_overdue',
  pending_approval: 'approval_assigned',
  reassigned_work: 'responsibility_changed',
};

export const NOTIFICATION_PROJECTION_KINDS = [
  'work_due',
  'work_overdue',
  'approval_assigned',
  'responsibility_changed',
] as const satisfies readonly NotificationKind[];

export function notificationKindFromAttention(type: AttentionType): NotificationKind | null {
  return NOTIFICATION_ATTENTION_KIND[type] ?? null;
}
