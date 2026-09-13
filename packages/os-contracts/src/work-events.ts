/** Work / approval BusinessEvent types (Lane E — ADR-0005). */
export const OS_WORK_EVENT_TYPES = [
  'work.created',
  'task.reassigned',
  'work.completed',
  'work.cancelled',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
] as const;

export type OsWorkEventType = (typeof OS_WORK_EVENT_TYPES)[number];

export function isOsWorkEventType(value: string): value is OsWorkEventType {
  return (OS_WORK_EVENT_TYPES as readonly string[]).includes(value);
}

export const WORK_ITEM_STATUSES = ['open', 'completed', 'cancelled'] as const;
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const WORK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type WorkPriority = (typeof WORK_PRIORITIES)[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** Subject types WorkItems may reference safely across lanes. */
export const WORK_SUBJECT_TYPES = [
  'party',
  'organization_member',
  'commercial_account',
  'work_item',
] as const;

export type WorkSubjectType = (typeof WORK_SUBJECT_TYPES)[number];

/** Governed approval subject types — explicit registry (Step 14.4). */
export const APPROVAL_SUBJECT_TYPES = [
  'party',
  'organization_member',
  'work_item',
] as const;

export type ApprovalSubjectType = (typeof APPROVAL_SUBJECT_TYPES)[number];

export function isApprovalSubjectType(value: string): value is ApprovalSubjectType {
  return (APPROVAL_SUBJECT_TYPES as readonly string[]).includes(value);
}

/** Known work subject types not yet enabled for Approval — require explicit extension. */
export const APPROVAL_SUBJECT_TYPES_BLOCKED = ['commercial_account'] as const;
