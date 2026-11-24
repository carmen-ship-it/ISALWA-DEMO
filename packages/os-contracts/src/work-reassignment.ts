/**
 * Work domains for ReassignWork and the workforce continuity list
 * (R4 23:27 §1, corrected 23:47 §A).
 *
 * Domain comes only from explicit signals written by the product when the work was
 * created: a source marker in the title/description, the fixed production next-action
 * title, or the subject relationship. Anything not recognized is `unknown` and fails
 * closed.
 *
 * - `customer`: subject `party` / `commercial_account` with no domain marker (commercial
 *   follow-ups). Reassigned with commercial.work.manage plus range over the account.
 * - `production`: `[[order-prep:production:…]]`, `[[production-update:…]]`,
 *   `[[production-next:…]]`, or the production next-action title.
 * - `warehouse`: `[[order-prep:warehouse:…]]`.
 * - `purchasing`: `[[order-prep:purchasing:…]]`, `[[compras-result:…]]`.
 * - `linked`: subject `work_item`; follows the referenced item.
 * - `general`: subject `organization_member`, or no subject and no marker (an unlinked
 *   task). Workforce administration (people.admin).
 * - `unknown`: an unrecognized marker or subject type.
 *
 * Production, warehouse and purchasing have no operational reassignment authority yet
 * (only record scopes exist), so reassignment of that work is disabled pending a bounded
 * authority definition. This is an incomplete workflow, not a permanent refusal.
 */
export type WorkReassignmentClass =
  | 'customer'
  | 'production'
  | 'warehouse'
  | 'purchasing'
  | 'linked'
  | 'general'
  | 'unknown';

/** Domains whose reassignment authority is not defined yet; ReassignWork refuses them. */
export const WORK_REASSIGNMENT_PENDING_AUTHORITY: readonly WorkReassignmentClass[] = [
  'production',
  'warehouse',
  'purchasing',
];

export const PRODUCTION_NEXT_ACTION_TITLE_PREFIX = 'Producción · próxima acción';

/** Plant fact recorded as Work (no due date required). Distinct from a dated follow-up. */
export const PRODUCTION_UPDATE_TITLE_PREFIX = 'Producción · actualización';

export function productionNextActionMarker(orderId: string): string {
  return `[[production-next:${orderId.trim()}]]`;
}

export function productionAnnotationMarker(orderId: string): string {
  return `[[production-annotation:${orderId.trim()}]]`;
}

const MARKER = /\[\[([a-z-]+):([^\]]*)\]\]/g;

function markerDomain(name: string, value: string): WorkReassignmentClass {
  if (name === 'order-prep') {
    const department = value.split(':')[0];
    if (department === 'production' || department === 'warehouse' || department === 'purchasing') {
      return department;
    }
    return 'unknown';
  }
  if (name === 'production-update' || name === 'production-next' || name === 'production-annotation') {
    return 'production';
  }
  if (name === 'compras-result') return 'purchasing';
  return 'unknown';
}

export function classifyWorkForReassignment(work: {
  subjectType: string | null;
  title?: string | null;
  description: string | null;
}): WorkReassignmentClass {
  const text = `${work.title ?? ''}\n${work.description ?? ''}`;
  const domains = new Set<WorkReassignmentClass>();
  for (const match of text.matchAll(MARKER)) domains.add(markerDomain(match[1]!, match[2]!));
  if ((work.title ?? '').startsWith(PRODUCTION_NEXT_ACTION_TITLE_PREFIX)) domains.add('production');
  if ((work.title ?? '').startsWith(PRODUCTION_UPDATE_TITLE_PREFIX)) domains.add('production');
  if (domains.size > 1 || domains.has('unknown')) return 'unknown';
  if (domains.size === 1) return [...domains][0]!;

  switch (work.subjectType) {
    case 'party':
    case 'commercial_account':
      return 'customer';
    case 'work_item':
      return 'linked';
    case 'organization_member':
    case null:
      return 'general';
    default:
      return 'unknown';
  }
}
