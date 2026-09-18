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
  /**
   * Already-known quote href. Does not load quotes.
   * When set on an open opportunity, the primary step is Ver cotización.
   */
  linkedQuoteHref?: string | null;
};

export type OpportunityLinkedQuote = {
  quoteId: string;
  partyId: string;
  opportunityId: string | null;
  status?: string;
};

/**
 * Pick the linked quote the detail page already prefers, from quotes the caller already loaded.
 * Does not invent a quote id.
 */
export function preferredLinkedQuote(
  quotes: readonly OpportunityLinkedQuote[] | null | undefined,
  opportunityId: string,
): OpportunityLinkedQuote | null {
  const forOpportunity = (quotes ?? []).filter(
    (item) => item.opportunityId === opportunityId && item.quoteId.trim().length > 0,
  );
  return (
    forOpportunity.find((item) => item.status === 'submitted' || item.status === 'accepted') ??
    forOpportunity.find((item) => item.status === 'draft') ??
    forOpportunity[0] ??
    null
  );
}

export type QuoteApprovalDecision = 'approved' | 'rejected';

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
  /**
   * Latest non-pending approval decision on this quote (recorded status only).
   * Does not invent convert eligibility — convert still requires accepted + canConvert.
   */
  latestApprovalDecision?: QuoteApprovalDecision | null;
  /** Human-readable pending approval headline when status is pending. */
  pendingApprovalHeadline?: string | null;
  pendingApprovalHref?: string | null;
};

/** Safe CTA copy when approval attention has cleared after a recorded decision. */
export const APPROVAL_ATTENTION_RESOLVED_COPY =
  'La atención pendiente del aprobador se cierra al registrar la decisión.';

type OrderNextStepInput = {
  status: string;
  partyId: string;
  orderId: string;
  customerHref: string;
};


/**
 * Latest recorded approval decision from already-loaded rows.
 * Ignores pending; does not invent assignees or SLAs.
 */
export function latestQuoteApprovalDecision(
  approvals: ReadonlyArray<{ status: string; decidedAt?: string | null }>,
): QuoteApprovalDecision | null {
  const decided = approvals
    .filter((row): row is { status: QuoteApprovalDecision; decidedAt?: string | null } =>
      row.status === 'approved' || row.status === 'rejected',
    )
    .slice()
    .sort((a, b) => {
      const aAt = a.decidedAt?.trim() || '';
      const bAt = b.decidedAt?.trim() || '';
      if (aAt === bAt) return 0;
      return aAt < bAt ? 1 : -1;
    });
  return decided[0]?.status ?? null;
}

export function opportunityNextStep(input: OpportunityNextStepInput): CommercialNextStep | null {
  switch (input.status) {
    case 'open': {
      const linkedQuoteHref = input.linkedQuoteHref?.trim() || null;
      if (linkedQuoteHref) {
        return {
          statement: 'Esta oportunidad ya tiene una cotización.',
          href: linkedQuoteHref,
          hrefLabel: 'Ver cotización',
          waiting: false,
        };
      }
      return {
        statement: 'Prepare una cotización desde esta oportunidad.',
        href: input.newQuoteHref,
        hrefLabel: 'Crear cotización',
        waiting: false,
      };
    }
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
          statement:
            input.pendingApprovalHeadline?.trim() ||
            'Hay una aprobación pendiente. La decisión no crea un pedido.',
          href: input.pendingApprovalHref ?? null,
          hrefLabel: input.pendingApprovalHref ? 'Ver solicitud' : null,
          waiting: true,
        };
      }
      if (input.latestApprovalDecision === 'approved') {
        if (input.canRegisterFollowUp && input.followUpHref) {
          return {
            statement: `Aprobación registrada. ${APPROVAL_ATTENTION_RESOLVED_COPY} Continúe con el envío y el seguimiento; la aprobación no crea un pedido.`,
            href: input.followUpHref,
            hrefLabel: 'Registrar seguimiento',
            waiting: false,
          };
        }
        return {
          statement: `Aprobación registrada. ${APPROVAL_ATTENTION_RESOLVED_COPY} Continúe el trabajo comercial en esta cotización; la aprobación no crea un pedido.`,
          href: null,
          hrefLabel: null,
          waiting: false,
        };
      }
      if (input.latestApprovalDecision === 'rejected') {
        return {
          statement: `Aprobación rechazada. ${APPROVAL_ATTENTION_RESOLVED_COPY} Revise la cotización; no se creó un pedido.`,
          href: `/clientes/${input.partyId}`,
          hrefLabel: 'Ver cliente',
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
