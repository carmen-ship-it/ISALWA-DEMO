import { humanizeAuditAction, humanizeResourceType } from '@/lib/audit/humanize';

/** Resource types commonly present in OsAuditLog rows. */
export const AUDIT_RESOURCE_TYPE_KEYS = [
  'party',
  'contact',
  'work_item',
  'approval_request',
  'member',
  'opportunity',
  'quote',
  'order',
  'issue',
  'commitment',
  'conversation',
  'organization',
] as const;

export type AuditResourceTypeKey = (typeof AUDIT_RESOURCE_TYPE_KEYS)[number];

/** Common audit action keys for filter dropdown (exact API match). */
export const AUDIT_ACTION_FILTER_KEYS = [
  'party.created',
  'party.updated',
  'party.deactivated',
  'party.reactivated',
  'party.merged',
  'contact.updated',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
  'member.role.changed',
  'member.suspended',
  'member.activated',
  'member.terminated',
  'work_item.created',
  'work_item.updated',
  'work_item.created_from_conversation',
  'issue.reported',
  'issue.created_from_conversation',
  'opportunity.created',
  'opportunity.created_from_conversation',
  'quote.created',
  'quote.send_recorded',
  'order.created',
  'commitment.created',
  'commitment.created_from_conversation',
  'conversation.recorded',
  'follow_up.created_from_conversation',
] as const;

export type AuditActionFilterKey = (typeof AUDIT_ACTION_FILTER_KEYS)[number];

export function auditResourceTypeOptions(): Array<{ value: string; label: string }> {
  return AUDIT_RESOURCE_TYPE_KEYS.map((key) => ({
    value: key,
    label: humanizeResourceType(key),
  }));
}

export function auditActionOptions(): Array<{ value: string; label: string }> {
  return AUDIT_ACTION_FILTER_KEYS.map((key) => ({
    value: key,
    label: humanizeAuditAction(key),
  }));
}
