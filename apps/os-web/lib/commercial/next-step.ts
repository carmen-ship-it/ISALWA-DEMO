/**
 * Status-derived next-step copy for commercial records.
 * Does not invent follow-ups, calls, or pipeline rules — only what the stored status already implies.
 */

export const COMMERCIAL_NEXT_STEP_LABEL = 'Próximo paso';

export type CommercialNextStep = {
  statement: string;
  href: string | null;
  hrefLabel: string | null;
  /** True when the user must wait on someone else or the record is closed. */
  waiting: boolean;
};

type OpportunityNextStepInput = {
  status: string;
  partyId: string;
  opportunityId: string;
  newQuoteHref: string;
};

type QuoteNextStepInput = {
  status: string;
  partyId: string;
  quoteId: string;
  canConvertToOrder: boolean;
  relatedOrderHref: string | null;
  relatedOrderLabel: string | null;
  hasPendingApproval: boolean;
  canRegisterFollowUp: boolean;
  followUpHref: string | null;
};

type OrderNextStepInput = {
  status: string;
  partyId: string;
  orderId: string;
  customerHref: string;
};

export function opportunityNextStep(input: OpportunityNextStepInput): CommercialNextStep | null {
  switch (input.status) {
    case 'open':
      return {
        statement: 'Prepare una cotización desde esta oportunidad.',
        href: input.newQuoteHref,
        hrefLabel: 'Crear cotización',
        waiting: false,
      };
    case 'won':
      return {
        statement: 'Oportunidad ganada. El trabajo comercial continúa en cotizaciones y pedidos del cliente.',
        href: `/clientes/${input.partyId}`,
        hrefLabel: 'Ver cliente',
        waiting: false,
      };
    case 'lost':
    case 'cancelled':
      return {
        statement: 'Esta oportunidad está cerrada. No se puede cotizar desde aquí.',
        href: `/clientes/${input.partyId}`,
        hrefLabel: 'Ver cliente',
        waiting: true,
      };
    default:
      return null;
  }
}

export function quoteNextStep(input: QuoteNextStepInput): CommercialNextStep | null {
  switch (input.status) {
    case 'draft':
      return {
        statement: 'Complete las líneas y envíe la cotización cuando esté lista.',
        href: null,
        hrefLabel: null,
        waiting: false,
      };
    case 'submitted':
      if (input.hasPendingApproval) {
        return {
          statement: 'Hay una aprobación pendiente. La decisión no crea un pedido.',
          href: null,
          hrefLabel: null,
          waiting: true,
        };
      }
      if (input.canRegisterFollowUp && input.followUpHref) {
        return {
          statement:
            'Cotización presentada. Registre el envío manual y el seguimiento cuando lo acuerde.',
          href: input.followUpHref,
          hrefLabel: 'Registrar seguimiento',
          waiting: false,
        };
      }
      return {
        statement:
          'Cotización presentada. Registre el envío externo o espere la respuesta del cliente.',
        href: null,
        hrefLabel: null,
        waiting: true,
      };
    case 'accepted':
      if (input.relatedOrderHref) {
        return {
          statement: 'Esta cotización ya tiene un pedido.',
          href: input.relatedOrderHref,
          hrefLabel: input.relatedOrderLabel ? `Ver ${input.relatedOrderLabel}` : 'Ver pedido',
          waiting: false,
        };
      }
      if (input.canConvertToOrder) {
        return {
          statement: 'Cotización aceptada. Puede convertirla a pedido.',
          href: null,
          hrefLabel: null,
          waiting: false,
        };
      }
      return {
        statement: 'Cotización aceptada. La conversión a pedido depende de su permiso.',
        href: `/clientes/${input.partyId}`,
        hrefLabel: 'Ver cliente',
        waiting: true,
      };
    case 'cancelled':
      return {
        statement: 'Cotización cancelada. No se puede enviar ni convertir.',
        href: `/clientes/${input.partyId}`,
        hrefLabel: 'Ver cliente',
        waiting: true,
      };
    default:
      return null;
  }
}

export function orderNextStep(input: OrderNextStepInput): CommercialNextStep | null {
  switch (input.status) {
    case 'open':
      return {
        statement: 'Pedido registrado. El seguimiento operativo continúa en el caso del pedido.',
        href: input.customerHref,
        hrefLabel: 'Ver cliente',
        waiting: false,
      };
    case 'cancelled':
      return {
        statement: 'Pedido cancelado.',
        href: input.customerHref,
        hrefLabel: 'Ver cliente',
        waiting: true,
      };
    default:
      return null;
  }
}
