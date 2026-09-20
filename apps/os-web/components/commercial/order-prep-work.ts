import { CreateWorkItemPayloadSchema } from '@isalwa/os-contracts';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';

export const ORDER_PREP_COPY = {
  cardTitle: 'Preparación operativa',
  cardIntro: 'Revise qué áreas deben estar preparadas para este pedido.',
  production: {
    title: 'PRODUCCIÓN',
    body: 'Revise si este pedido requiere acción de producción.',
    action: 'Solicitar revisión',
    requested: 'Revisión solicitada',
    noAssignee: 'Aún no hay un responsable de producción asignado.',
  },
  warehouse: {
    title: 'ALMACÉN',
    body: 'Revise disponibilidad o próximos ingresos antes de preparar la salida.',
    action: 'Solicitar revisión',
    requested: 'Revisión solicitada',
    noAssignee: 'Aún no hay un responsable de almacén asignado.',
  },
  purchasing: {
    title: 'COMPRAS',
    body: 'Si este pedido requiere abastecimiento, solicite una revisión de Compras.',
    action: 'Solicitar revisión',
    requested: 'Revisión solicitada',
    noAssignee: 'Aún no hay un responsable de compras asignado.',
  },
  viewWork: 'Ver trabajo',
  toastOk: 'Revisión solicitada.',
} as const;

export type OrderPrepDepartment = 'production' | 'warehouse' | 'purchasing';

const DEPARTMENT_TITLES: Record<OrderPrepDepartment, string> = {
  production: 'Revisión de producción',
  warehouse: 'Revisión de almacén',
  purchasing: 'Revisión de abastecimiento',
};

/** Stable marker for idempotent open-review detection. Do not localize. */
export function orderPrepMarker(department: OrderPrepDepartment, orderId: string): string {
  return `[[order-prep:${department}:${orderId.trim()}]]`;
}

export function parseOrderPrepMarker(
  text: string | null | undefined,
): { department: OrderPrepDepartment; orderId: string } | null {
  if (!text) return null;
  const match = text.match(/\[\[order-prep:(production|warehouse|purchasing):([^\]]+)\]\]/);
  if (!match) return null;
  return {
    department: match[1] as OrderPrepDepartment,
    orderId: match[2].trim(),
  };
}

export type OrderPrepOpenReview = {
  department: OrderPrepDepartment;
  workItemId: string;
  title: string;
};

export function findOpenOrderPrepReviews(
  workItems: readonly Pick<
    WorkSummaryReadModel,
    'workItemId' | 'title' | 'description' | 'status' | 'subjectType' | 'subjectId'
  >[],
  orderId: string,
  partyId?: string | null,
): Partial<Record<OrderPrepDepartment, OrderPrepOpenReview>> {
  const wanted = orderId.trim();
  const party = partyId?.trim() ?? '';
  const out: Partial<Record<OrderPrepDepartment, OrderPrepOpenReview>> = {};
  for (const row of workItems) {
    if (row.status !== 'open') continue;
    if (party && row.subjectType === 'party' && row.subjectId && row.subjectId !== party) continue;
    const parsed = parseOrderPrepMarker(row.description) ?? parseOrderPrepMarker(row.title);
    if (!parsed || parsed.orderId !== wanted) continue;
    if (out[parsed.department]) continue;
    out[parsed.department] = {
      department: parsed.department,
      workItemId: row.workItemId,
      title: row.title,
    };
  }
  return out;
}

/**
 * Production requires a governed destination member.
 * Warehouse / Compras may create requester-owned coordination Work when no
 * canonical assignee exists (does not invent a department owner).
 */
export function canRequestOrderPrepReview(
  department: OrderPrepDepartment,
  assigneeMemberId: string | null | undefined,
): boolean {
  const assignee = assigneeMemberId?.trim() ?? '';
  if (department === 'production') return Boolean(assignee);
  return true;
}

export type OrderPrepReviewWorkResult =
  | {
      ok: true;
      command: 'CreateWorkItem';
      payload: Record<string, unknown>;
      department: OrderPrepDepartment;
      needsAssignee: boolean;
    }
  | {
      ok: false;
      reason: 'missing_order' | 'missing_actor' | 'missing_assignee' | 'invalid_payload';
    };

/**
 * "Solicitar revisión" creates governed Work on the customer party with Pedido context.
 * Does not mutate Pedido, inventory, or approvals. Does not auto-complete on notification read.
 */
export function buildOrderPrepReviewWork(input: {
  department: OrderPrepDepartment;
  orderId: string;
  partyId: string;
  actorMemberId: string;
  assigneeMemberId?: string | null;
  orderLabel?: string | null;
}): OrderPrepReviewWorkResult {
  const orderId = input.orderId.trim();
  const partyId = input.partyId.trim();
  const actorMemberId = input.actorMemberId.trim();
  if (!orderId) return { ok: false, reason: 'missing_order' };
  if (!actorMemberId) return { ok: false, reason: 'missing_actor' };

  const assignee = input.assigneeMemberId?.trim() ?? '';
  if (!canRequestOrderPrepReview(input.department, assignee)) {
    return { ok: false, reason: 'missing_assignee' };
  }

  // Prefer canonical assignee; otherwise requester owns coordination Work (not a invented dept owner).
  const ownerMemberId = assignee || actorMemberId;
  const label = input.orderLabel?.trim();
  const titleBase = DEPARTMENT_TITLES[input.department];
  const title = label ? `${titleBase} · ${label}` : titleBase;
  const marker = orderPrepMarker(input.department, orderId);
  const orderRef = label ? `${label} (${orderId})` : orderId;

  const payload = {
    title,
    description: `${ORDER_PREP_COPY[input.department].body}\n\nContexto: Pedido ${orderRef}\n${marker}`,
    ownerMemberId,
    subjectType: 'party' as const,
    subjectId: partyId,
    priority: 'normal' as const,
  };

  const parsed = CreateWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: 'invalid_payload' };

  return {
    ok: true,
    command: 'CreateWorkItem',
    payload: parsed.data as Record<string, unknown>,
    department: input.department,
    needsAssignee: !assignee,
  };
}

export function visibleWorkDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = presentHumanCopy(text).replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return cleaned || null;
}

export function orderPrepPartyHref(partyId: string, orderId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/pedidos/${encodeURIComponent(orderId)}`;
}
