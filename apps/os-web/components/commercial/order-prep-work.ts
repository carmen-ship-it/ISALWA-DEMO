import { CreateWorkItemPayloadSchema } from '@isalwa/os-contracts';

export const ORDER_PREP_COPY = {
  cardTitle: 'Preparación operativa',
  cardIntro: 'Revise si este pedido requiere coordinación entre áreas. ISALWA no asume que cada área deba actuar.',
  production: {
    title: 'Producción',
    body: 'Revisar si este pedido requiere acción de producción.',
    action: 'Solicitar revisión',
  },
  warehouse: {
    title: 'Almacén',
    body: 'Revisar disponibilidad o próximos ingresos.',
    action: 'Solicitar revisión',
  },
  purchasing: {
    title: 'Compras',
    body: 'Si el pedido requiere abastecimiento, envíelo a revisión.',
    action: 'Solicitar revisión',
  },
  noAssignee: 'Aún no hay un responsable asignado.',
  assignOwner: 'Asignar responsable',
} as const;

export type OrderPrepDepartment = 'production' | 'warehouse' | 'purchasing';

const DEPARTMENT_TITLES: Record<OrderPrepDepartment, string> = {
  production: 'Revisión de producción',
  warehouse: 'Revisión de almacén',
  purchasing: 'Revisión de compras',
};

export type OrderPrepReviewWorkResult =
  | {
      ok: true;
      command: 'CreateWorkItem';
      payload: Record<string, unknown>;
      department: OrderPrepDepartment;
      needsAssignee: boolean;
    }
  | { ok: false; reason: 'missing_order' | 'missing_actor' | 'invalid_payload' };

/**
 * "Solicitar revisión" creates governed Work on the Pedido subject.
 * Does not auto-complete when a notification is read.
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
  const ownerMemberId = assignee || actorMemberId;
  const label = input.orderLabel?.trim();
  const titleBase = DEPARTMENT_TITLES[input.department];
  const title = label ? `${titleBase} · ${label}` : titleBase;

  const orderRef = label ? `${label} (${orderId})` : orderId;
  const payload = {
    title,
    description: `${ORDER_PREP_COPY[input.department].body}\n\nContexto: Pedido ${orderRef}`,
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

export function orderPrepPartyHref(partyId: string, orderId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}/pedidos/${encodeURIComponent(orderId)}`;
}
