/**
 * Event → WorkItem offer adapters.
 * These never create work automatically and never invent a due date.
 * The employee chooses dueAt unless an approved rule exists (none in V1).
 */

export const EVENT_WORK_OFFER_COPY = {
  quoteSent: 'Registrar seguimiento de cotización',
  productionExpected: 'Registrar trabajo por fecha de planta',
  deliveryFollowUp: 'Registrar seguimiento de entrega',
  dueRequired: 'Elija la fecha. No se inventa un plazo automático.',
  noAutoSla: 'Sin regla de “X días después”.',
  reminderInProduct: 'El recordatorio queda en Trabajo y Atención del producto.',
} as const;

export type EventWorkOfferTrigger =
  | 'quote_sent'
  | 'production_expected_date'
  | 'delivery_follow_up';

export type EventWorkOffer = {
  trigger: EventWorkOfferTrigger;
  offered: true;
  /** Always true in V1 — no approved auto-due rule. */
  requiresUserDueDate: true;
  /** Never populated by these adapters. */
  autoDueAt: null;
  suggestedTitle: string;
  partyId: string | null;
  contextLabel: string;
  createCommand: 'CreateWorkItem';
};

export type EventWorkOfferDenied = {
  offered: false;
  reason: 'not_eligible' | 'missing_party' | 'missing_date';
};

export type EventWorkOfferResult = EventWorkOffer | EventWorkOfferDenied;

/** Manual quote send / submitted quote may offer a human follow-up. */
export function offerAfterQuoteSent(input: {
  quoteStatus: string;
  partyId: string | null | undefined;
  quoteNumber?: string | null;
}): EventWorkOfferResult {
  if (input.quoteStatus !== 'submitted') {
    return { offered: false, reason: 'not_eligible' };
  }
  const partyId = input.partyId?.trim() ?? '';
  if (!partyId) return { offered: false, reason: 'missing_party' };
  const quoteLabel = input.quoteNumber?.trim();
  return {
    trigger: 'quote_sent',
    offered: true,
    requiresUserDueDate: true,
    autoDueAt: null,
    suggestedTitle: quoteLabel
      ? `Seguimiento cotización ${quoteLabel}`
      : 'Seguimiento de cotización enviada',
    partyId,
    contextLabel: EVENT_WORK_OFFER_COPY.quoteSent,
    createCommand: 'CreateWorkItem',
  };
}

/**
 * Production internal expected date may offer work.
 * Does not copy the plant date into dueAt — the user must choose.
 */
export function offerAfterProductionExpectedDate(input: {
  targetOn: string | null | undefined;
  partyId?: string | null;
  orderLabel?: string | null;
}): EventWorkOfferResult {
  const targetOn = input.targetOn?.trim() ?? '';
  if (!targetOn) return { offered: false, reason: 'missing_date' };
  const orderLabel = input.orderLabel?.trim();
  return {
    trigger: 'production_expected_date',
    offered: true,
    requiresUserDueDate: true,
    autoDueAt: null,
    suggestedTitle: orderLabel
      ? `Revisar planta · ${orderLabel}`
      : 'Revisar fecha esperada de planta',
    partyId: input.partyId?.trim() || null,
    contextLabel: EVENT_WORK_OFFER_COPY.productionExpected,
    createCommand: 'CreateWorkItem',
  };
}

/** Delivery record may offer a follow-up. No automatic lag after delivery. */
export function offerAfterDeliveryFollowUp(input: {
  deliveryId?: string | null;
  partyId?: string | null;
  deliveredAt?: string | null;
}): EventWorkOfferResult {
  const deliveryId = input.deliveryId?.trim() ?? '';
  const deliveredAt = input.deliveredAt?.trim() ?? '';
  if (!deliveryId && !deliveredAt) {
    return { offered: false, reason: 'not_eligible' };
  }
  return {
    trigger: 'delivery_follow_up',
    offered: true,
    requiresUserDueDate: true,
    autoDueAt: null,
    suggestedTitle: 'Seguimiento de entrega',
    partyId: input.partyId?.trim() || null,
    contextLabel: EVENT_WORK_OFFER_COPY.deliveryFollowUp,
    createCommand: 'CreateWorkItem',
  };
}

/** True only when the adapter explicitly offers and never supplies autoDueAt. */
export function eventWorkOfferIsHonest(offer: EventWorkOffer): boolean {
  return offer.offered === true && offer.requiresUserDueDate === true && offer.autoDueAt === null;
}
