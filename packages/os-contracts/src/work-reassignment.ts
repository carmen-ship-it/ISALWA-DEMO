/**
 * Work classes for ReassignWork and the continuity list (R4, 2026-10-16 23:27 §1).
 *
 * - `customer`: subject is a party or commercial account. Reassigned only with
 *   commercial.work.manage plus current range over the account (canManageCustomerAccountWork),
 *   to a target inside the actor's range.
 * - `purchasing`: open purchasing prep review. Any Compras member resolves it; there is no
 *   reassignment permission for it, so ReassignWork refuses it.
 * - `linked`: subject is another work item; classified by the referenced item.
 * - `general`: everything else (no subject, organization_member, production/warehouse prep
 *   reviews). Workforce continuity: people.admin.
 */
export type WorkReassignmentClass = 'customer' | 'purchasing' | 'linked' | 'general';

const PURCHASING_PREP_MARKER = /\[\[order-prep:purchasing:[^\]]+\]\]/;

export function classifyWorkForReassignment(work: {
  subjectType: string | null;
  title?: string | null;
  description: string | null;
}): WorkReassignmentClass {
  if (work.subjectType === 'party' || work.subjectType === 'commercial_account') return 'customer';
  if (PURCHASING_PREP_MARKER.test(`${work.title ?? ''}\n${work.description ?? ''}`)) return 'purchasing';
  if (work.subjectType === 'work_item') return 'linked';
  return 'general';
}
