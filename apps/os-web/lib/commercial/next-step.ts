/**
 * Status-derived next-step copy for commercial records.
 * Does not invent follow-ups, calls, or pipeline rules — only what the stored status already implies.
 */

export const COMMERCIAL_NEXT_STEP_LABEL = 'Próxima acción';

/** Presentation only. Does not change a stored reason. */
export function presentSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function presentLines(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ? presentSentence(part) : ''))
    .filter((part) => part.length > 0)
    .join('\n');
}

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
   * When set on an open opportunity, the primary step continues or opens that quote.
   */
  linkedQuoteHref?: string | null;
  /** Status of the linked quote when already known. Draft → Continuar. */
  linkedQuoteStatus?: string | null;
  /** Human quote number when already known (e.g. Q-000018). */
  linkedQuoteNumber?: string | null;
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
  /** True after the person already registered the external send. */
  sendRecorded?: boolean;
  /**
   * Latest non-pending approval decision on this quote (recorded status only).
   * Does not invent convert eligibility — convert still requires accepted + canConvert.
   */
  latestApprovalDecision?: QuoteApprovalDecision | null;
  quoteNumber?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  /** Human-readable pending approval headline when status is pending. */
  pendingApprovalHeadline?: string | null;
  pendingApprovalHref?: string | null;
  /** Saved quote lines already on the record. Used for draft next-action copy. */
  lineCount?: number;
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
        const status = input.linkedQuoteStatus?.trim() || '';
        const number = input.linkedQuoteNumber?.trim() || '';
        if (status === 'draft') {
          return {
            statement: 'Continúe la cotización en borrador de esta oportunidad.',
            href: linkedQuoteHref,
            hrefLabel: number ? `Continuar cotización ${number}` : 'Continuar cotización',
            waiting: false,
          };
        }
        return {
          statement: 'Esta oportunidad ya tiene una cotización.',
          href: linkedQuoteHref,
          hrefLabel: number ? `Ver cotización ${number}` : 'Ver cotización',
          waiting: false,
        };
      }
      return {
        statement: 'Prepare una cotización para esta oportunidad.',
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
        statement:
          (input.lineCount ?? 0) > 0
            ? 'Revise la cotización y preséntela.'
            : 'Agregue productos a la cotización.',
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
        const number = input.quoteNumber?.trim();
        const who = input.rejectedBy?.trim();
        const why = input.rejectionReason?.trim();
        return {
          statement: presentLines([
            number ? `Cotización ${number} rechazada` : 'Aprobación rechazada',
            who ? `Rechazada por: ${who}` : null,
            why ? `Motivo: ${why}` : null,
            'No se creó un pedido',
          ]),
          href: `/clientes/${input.partyId}/cotizaciones/${input.quoteId}`,
          hrefLabel: 'Ver cotización',
          waiting: true,
        };
      }
      if (input.canRegisterFollowUp && input.followUpHref && input.sendRecorded) {
        return {
          statement:
            'Envío registrado. Programe el seguimiento cuando lo acuerde. ISALWA no envía el mensaje.',
          href: input.followUpHref,
          hrefLabel: 'Registrar seguimiento',
          waiting: false,
        };
      }
      return {
        statement:
          'Descargue la cotización y envíela por su canal habitual. Después, regístrela como enviada para continuar el seguimiento.',
        href: '#envio',
        hrefLabel: 'Registrar como enviada',
        waiting: false,
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
        statement:
          'Pedido registrado. Desde este pedido puede solicitar revisión de Producción, Almacén o Compras. El trabajo no se crea solo.',
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
