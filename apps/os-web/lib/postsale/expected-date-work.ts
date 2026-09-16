/**
 * Optional expected/next date on a Pedido-scoped production annotation.
 * Wires to existing CreateWorkItem + dueAt → Attention overdue_work.
 * Does not invent reminder intervals or a parallel attention type.
 */

import { CreateWorkItemPayloadSchema } from '@isalwa/os-contracts';
import { dueAtInputToIso } from '@/lib/work/follow-up';

export const PRODUCTION_EXPECTED_DATE_COPY = {
  titlePrefix: 'Producción · próxima acción',
  titleRequired: 'Escriba la anotación operativa.',
  dueInvalid: 'La fecha esperada no es válida.',
  identityMissing: 'No se pudo identificar su usuario.',
  pedidoMissing: 'Seleccione un pedido.',
  customerMissing: 'El pedido no tiene cliente heredado.',
  productMissing: 'Seleccione un producto del pedido.',
} as const;

export type ProductionExpectedDateInput = {
  annotation: string;
  note?: string | null;
  expectedAt?: string | null;
  ownerMemberId: string;
  partyId: string;
  orderId: string;
  orderLabel: string;
  productLabel: string;
  orderLineId?: string | null;
};

export type ProductionExpectedDateBuildResult =
  | {
      ok: true;
      work: { command: 'CreateWorkItem'; payload: Record<string, unknown> } | null;
      annotation: string;
      note: string | null;
    }
  | { ok: false; error: string };

/**
 * Build a Work item for an optional expected date.
 * Subject is the customer (party) — WorkSubjectType does not include order.
 * Pedido / product stay in title + description so Attention stays on existing types.
 */
export function buildProductionExpectedDateWork(
  input: ProductionExpectedDateInput,
): ProductionExpectedDateBuildResult {
  const annotation = input.annotation.trim();
  if (!annotation) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.titleRequired };

  const ownerMemberId = input.ownerMemberId.trim();
  if (!ownerMemberId) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.identityMissing };

  const partyId = input.partyId.trim();
  const orderId = input.orderId.trim();
  if (!orderId) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.pedidoMissing };
  if (!partyId) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.customerMissing };

  const productLabel = input.productLabel.trim();
  if (!productLabel) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.productMissing };

  const note = input.note?.trim() || null;
  const due = dueAtInputToIso(input.expectedAt);
  if (due === 'invalid') return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.dueInvalid };

  if (!due) {
    return { ok: true, work: null, annotation, note };
  }

  const title = `${PRODUCTION_EXPECTED_DATE_COPY.titlePrefix}: ${input.orderLabel} · ${productLabel}`;
  const descriptionParts = [annotation];
  if (note) descriptionParts.push(note);
  if (input.orderLineId?.trim()) {
    descriptionParts.push(`Línea del pedido (contexto): ${input.orderLineId.trim()}`);
  }
  descriptionParts.push(`Pedido: ${input.orderLabel} (${orderId})`);

  const payload: Record<string, unknown> = {
    title,
    description: descriptionParts.join('\n'),
    ownerMemberId,
    subjectType: 'party',
    subjectId: partyId,
    dueAt: due,
  };

  const parsed = CreateWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: PRODUCTION_EXPECTED_DATE_COPY.dueInvalid };

  return {
    ok: true,
    work: { command: 'CreateWorkItem', payload: parsed.data as Record<string, unknown> },
    annotation,
    note,
  };
}
