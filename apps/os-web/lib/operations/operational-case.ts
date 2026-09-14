/**
 * Spanish listing for one order's annotations and release decisions.
 * Additive to the manual operations host. Does not persist and does not confirm.
 *
 * A customer saying they paid is not a confirmed payment.
 * A release decision is not a confirmed payment.
 * Payment is not required before the pedido can proceed.
 * Official accounting stays outside this screen.
 */

export const ORDER_CASE_HEADING = 'Sobre este pedido';
export const ORDER_CASE_INTRO =
  'Lo que alguien informó y si se puede seguir. El pago no es siempre requisito. Esto no confirma el pago.';
export const ORDER_CASE_EMPTY = 'Nadie anotó nada sobre este pedido.';
export const ORDER_CASE_PENDING = 'Pendiente de confirmar';
export const ORDER_CASE_ACCOUNTING = 'La contabilidad oficial queda afuera.';
export const ORDER_CASE_PAYMENT_NOT_REQUIRED =
  'Se puede seguir con el pedido por un acuerdo comercial, no solo por un pago.';
export const ORDER_CASE_RELEASE_NOT_PAYMENT = 'Esta decisión no confirma el pago.';
export const ORDER_CASE_UNAVAILABLE =
  'Las anotaciones de este pedido no están en esta vista. No se inventan.';

const FORBIDDEN_COPY = [
  /\bpagado\b/i,
  /\bcobrado\b/i,
  /\bentregado\b/i,
  /pago confirmado/i,
  /paymentConfirmed/i,
  /\bERP\b/,
  /disponibilidad/i,
];

export type OrderCaseFactKind = 'payment_report' | 'delivery_report' | 'stock_report' | 'note';
export type OrderCaseFactSource = 'manual' | 'customer_message';
export type OrderCaseReleaseState = 'released' | 'held';
export type OrderCaseReleaseBasis = 'payment_verified' | 'commercial_agreement' | 'authorized_other';

export type OrderCaseFactInput = {
  id: string;
  organizationId: string;
  orderId: string;
  orderLineId?: string | null;
  kind: OrderCaseFactKind;
  source: OrderCaseFactSource;
  actorLabel: string;
  occurredAt: string;
  recordedAt: string;
  evidenceText: string;
  confirmation?: string;
  reversalReason?: string | null;
};

export type OrderCaseReleaseInput = {
  id: string;
  organizationId: string;
  orderId: string;
  state: OrderCaseReleaseState;
  basis: OrderCaseReleaseBasis;
  reason: string;
  actorLabel: string;
  decidedAt: string;
  evidenceText: string;
  evidenceReference?: string | null;
  reversalReason?: string | null;
};

export type OrderCaseLine = {
  id: string;
  title: string;
  value: string;
  confirmation: typeof ORDER_CASE_PENDING | null;
  who: string;
  when: string | null;
  evidence: string;
  boundary: string;
  reversal: string | null;
  line: string | null;
};

export type OrderCasePanelModel = {
  heading: typeof ORDER_CASE_HEADING;
  intro: typeof ORDER_CASE_INTRO;
  empty: typeof ORDER_CASE_EMPTY;
  accounting: typeof ORDER_CASE_ACCOUNTING;
  paymentNotRequired: typeof ORDER_CASE_PAYMENT_NOT_REQUIRED;
  facts: OrderCaseLine[];
  releases: OrderCaseLine[];
};

function formatWhen(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function assertSafeCopy(text: string): void {
  for (const pattern of FORBIDDEN_COPY) {
    if (pattern.test(text)) {
      throw new Error('Order case copy must not sound like confirmed payment or official accounting');
    }
  }
}

function factTitle(kind: OrderCaseFactKind): string {
  if (kind === 'payment_report') return 'Pago informado';
  if (kind === 'delivery_report') return 'Entrega informada';
  if (kind === 'stock_report') return 'Stock informado';
  return 'Anotación';
}

function factBoundary(kind: OrderCaseFactKind): string {
  if (kind === 'payment_report') return 'Esto no confirma el pago.';
  if (kind === 'delivery_report') return 'Esto no confirma la entrega.';
  if (kind === 'stock_report') return 'Esto no confirma el stock.';
  return 'Es una anotación. No cambia el pedido.';
}

function releaseTitle(state: OrderCaseReleaseState): string {
  return state === 'released' ? 'Se puede seguir con el pedido' : 'Todavía no se sigue con el pedido';
}

function releaseBoundary(basis: OrderCaseReleaseBasis): string {
  if (basis === 'payment_verified') {
    return 'Alguien revisó un pago. Eso no lo confirma.';
  }
  if (basis === 'commercial_agreement') {
    return 'Motivo: acuerdo comercial. El pago no era requisito.';
  }
  return ORDER_CASE_RELEASE_NOT_PAYMENT;
}

function sourceWho(source: OrderCaseFactSource, actorLabel: string): string {
  const who = source === 'customer_message' ? 'Lo dijo en un mensaje' : 'Lo anotó una persona';
  return `${who}. Anotado por ${actorLabel}`;
}

/** Lists only this order in this organization. Confirmation is always pending on screen. */
export function orderCasePanelModel(input: {
  organizationId: string;
  orderId: string;
  facts: readonly OrderCaseFactInput[];
  releases?: readonly OrderCaseReleaseInput[];
}): OrderCasePanelModel {
  const facts = input.facts
    .filter((item) => item.organizationId === input.organizationId && item.orderId === input.orderId)
    .map((item): OrderCaseLine => {
      const line: OrderCaseLine = {
        id: item.id,
        title: factTitle(item.kind),
        value: item.evidenceText,
        confirmation: ORDER_CASE_PENDING,
        who: sourceWho(item.source, item.actorLabel),
        when: formatWhen(item.occurredAt),
        evidence: item.evidenceText,
        boundary: factBoundary(item.kind),
        reversal: item.reversalReason
          ? 'Se anuló. Se conserva lo que se escribió.'
          : null,
        line: item.orderLineId ? 'Aplica a una línea del pedido' : null,
      };
      assertSafeCopy(JSON.stringify(line));
      return line;
    });

  const releases = (input.releases ?? [])
    .filter((item) => item.organizationId === input.organizationId && item.orderId === input.orderId)
    .map((item): OrderCaseLine => {
      const line: OrderCaseLine = {
        id: item.id,
        title: releaseTitle(item.state),
        value: item.reason,
        confirmation: null,
        who: `Decidió ${item.actorLabel}`,
        when: formatWhen(item.decidedAt),
        evidence: item.evidenceReference
          ? `${item.evidenceText}. Referencia anotada.`
          : item.evidenceText,
        boundary: `${releaseBoundary(item.basis)} ${ORDER_CASE_RELEASE_NOT_PAYMENT} ${ORDER_CASE_ACCOUNTING}`,
        reversal: item.reversalReason
          ? 'Se anuló la decisión. Se conserva lo que se escribió.'
          : null,
        line: null,
      };
      assertSafeCopy(JSON.stringify(line));
      return line;
    });

  const model: OrderCasePanelModel = {
    heading: ORDER_CASE_HEADING,
    intro: ORDER_CASE_INTRO,
    empty: ORDER_CASE_EMPTY,
    accounting: ORDER_CASE_ACCOUNTING,
    paymentNotRequired: ORDER_CASE_PAYMENT_NOT_REQUIRED,
    facts,
    releases,
  };
  assertSafeCopy(
    [model.heading, model.intro, model.empty, model.accounting, model.paymentNotRequired].join('\n'),
  );
  return model;
}
