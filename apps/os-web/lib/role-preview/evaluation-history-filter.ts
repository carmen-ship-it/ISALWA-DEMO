/**
 * View As filters for audit + party timeline — never elevates.
 * Prevents history/audit from becoming a backdoor to unauthorized records.
 */
import type { EvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';

/** Audit resourceType allow-lists by evaluation persona. */
const AUDIT_RESOURCE_TYPES: Record<RolePreviewPersonaId, readonly string[]> = {
  asesor: ['party', 'opportunity', 'quote', 'order', 'conversation', 'work_item', 'approval', 'commitment', 'issue'],
  'jefe-comercial': [
    'party',
    'opportunity',
    'quote',
    'order',
    'conversation',
    'work_item',
    'approval',
    'commitment',
    'issue',
  ],
  gerencia: [
    'party',
    'opportunity',
    'quote',
    'order',
    'conversation',
    'work_item',
    'approval',
    'commitment',
    'issue',
    'member',
    'delegation',
  ],
  produccion: ['order', 'work_item', 'issue'],
  almacen: ['order', 'work_item', 'finished_goods', 'warehouse_exit', 'delivery_note'],
  compras: ['order', 'work_item', 'purchase_request', 'issue'],
  entregas: ['order', 'delivery_note', 'warehouse_exit', 'delivery', 'work_item'],
  finanzas: ['order', 'quote', 'work_item', 'reported_operational_fact'],
};

/** Party timeline eventType prefixes / tokens allowed per persona. */
const TIMELINE_EVENT_ALLOW: Record<RolePreviewPersonaId, readonly string[]> = {
  asesor: [
    'party.',
    'contact.',
    'location.',
    'opportunity.',
    'quote.',
    'order.',
    'approval.',
    'work_item.',
    'conversation.',
    'commitment.',
    'issue.',
    'follow_up.',
  ],
  'jefe-comercial': [
    'party.',
    'contact.',
    'location.',
    'opportunity.',
    'quote.',
    'order.',
    'approval.',
    'work_item.',
    'conversation.',
    'commitment.',
    'issue.',
    'follow_up.',
  ],
  gerencia: [''], // all
  produccion: ['order.', 'work_item.', 'issue.', 'finished_goods.', 'production.'],
  almacen: ['order.', 'work_item.', 'finished_goods.', 'warehouse.', 'delivery_note.'],
  compras: ['order.', 'work_item.', 'purchase.', 'issue.'],
  entregas: ['order.', 'delivery', 'warehouse_exit', 'salida', 'entrega', 'work_item.'],
  finanzas: ['order.', 'quote.', 'reported_operational', 'finance.', 'work_item.'],
};

function eventMatchesAllow(eventType: string, allow: readonly string[]): boolean {
  if (allow.length === 1 && allow[0] === '') return true;
  const lower = eventType.toLowerCase();
  return allow.some((token) => {
    if (!token) return true;
    const needle = token.toLowerCase().replace(/\.$/, '');
    return lower.includes(needle) || lower.startsWith(token.toLowerCase());
  });
}

export function evaluationAllowsAuditDesk(projection: EvaluationProjection): boolean {
  if (!projection.active) return true;
  // Ops previews may see filtered audit; Asesor/Jefe/Gerencia too.
  return Boolean(projection.persona);
}

export function filterAuditItemsForProjection<T extends { resourceType: string; resourceId: string }>(
  projection: EvaluationProjection,
  items: readonly T[],
  opts?: {
    /** When Asesor: only these party/resource ids (owned universe). */
    allowedResourceIds?: ReadonlySet<string>;
  },
): T[] {
  if (!projection.active || !projection.persona) return [...items];
  const types = new Set(AUDIT_RESOURCE_TYPES[projection.persona] ?? []);
  let next = items.filter((item) => types.has(item.resourceType));
  if (projection.persona === 'asesor' && opts?.allowedResourceIds) {
    next = next.filter(
      (item) =>
        opts.allowedResourceIds!.has(item.resourceId) ||
        (item.resourceType === 'party' && opts.allowedResourceIds!.has(item.resourceId)),
    );
  }
  return next;
}

export function filterTimelineItemsForProjection<T extends { eventType: string }>(
  projection: EvaluationProjection,
  items: readonly T[],
): T[] {
  if (!projection.active || !projection.persona) return [...items];
  const allow = TIMELINE_EVENT_ALLOW[projection.persona] ?? [];
  return items.filter((item) => eventMatchesAllow(item.eventType, allow));
}

export function evaluationBlocksAuditResource(
  projection: EvaluationProjection,
  resourceType: string,
  resourceId: string,
  allowedResourceIds?: ReadonlySet<string>,
): boolean {
  if (!projection.active || !projection.persona) return false;
  const types = AUDIT_RESOURCE_TYPES[projection.persona] ?? [];
  if (!types.includes(resourceType)) return true;
  if (projection.persona === 'asesor' && allowedResourceIds && !allowedResourceIds.has(resourceId)) {
    return true;
  }
  return false;
}

/** Document link kinds allowed under View As (Cliente360 Documentos). */
export function filterDocumentLinksForProjection<
  T extends { type: string },
>(projection: EvaluationProjection, links: readonly T[]): T[] {
  if (!projection.active || !projection.persona) return [...links];
  switch (projection.persona) {
    case 'asesor':
    case 'jefe-comercial':
    case 'gerencia':
      return links.filter((l) => l.type !== 'delivery_note_pdf');
    case 'entregas':
      return links.filter((l) => l.type === 'delivery_note_pdf');
    case 'almacen':
      return links.filter((l) => l.type !== 'delivery_note_pdf' && l.type !== 'quote_pdf' && l.type !== 'send_evidence');
    case 'produccion':
    case 'compras':
    case 'finanzas':
      return [];
    default:
      return [];
  }
}
