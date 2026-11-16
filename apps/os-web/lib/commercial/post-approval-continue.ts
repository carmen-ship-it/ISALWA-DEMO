/**
 * Post-approval continue cues for the commercial journey.
 * Approval records a decision only — it never CreateOrder.
 * Convert remains a separate, authority-gated step on the quote.
 */

import { formatQuoteStatus } from '@/lib/commercial/labels';
import { quoteHref } from '@/lib/commercial/navigation';
import { QUOTE_LIFECYCLE_LABELS } from '@/lib/commercial/quote-lifecycle';
import { formatApprovalStatus } from '@/lib/work/labels';

export const POST_APPROVAL_QUOTE_LINK_LABEL = 'Ver cotización';
export const POST_APPROVAL_CONVERT_LABEL = QUOTE_LIFECYCLE_LABELS.createOrder;
export const POST_APPROVAL_ISSUE_NEXT_STEP =
  'Aprobación registrada. El siguiente paso es Emitir cotización. La aprobación no crea un pedido.';
export const POST_APPROVAL_CANCELLED_EXPLANATION =
  'Cotización cancelada. No se puede enviar ni convertir.';

const CONVERT_HASH = 'convertir-pedido';

export type PostApprovalContinueInput = {
  approvalStatus: string;
  subjectType: string;
  quoteStatus: string | null;
  canConvertToOrder: boolean;
  partyId: string | null;
  quoteId: string | null;
};

export type PostApprovalContinue = {
  showContinue: boolean;
  decisionLabel: string | null;
  quoteLinkLabel: string | null;
  quoteHref: string | null;
  convertLabel: string | null;
  convertHref: string | null;
  stateExplanation: string | null;
};

export function quoteConvertHref(partyId: string, quoteId: string): string {
  return `${quoteHref(partyId, quoteId)}#${CONVERT_HASH}`;
}

export function postApprovalContinue(input: PostApprovalContinueInput): PostApprovalContinue {
  const decided = input.approvalStatus === 'approved' || input.approvalStatus === 'rejected';
  if (!decided) {
    return {
      showContinue: false,
      decisionLabel: null,
      quoteLinkLabel: null,
      quoteHref: null,
      convertLabel: null,
      convertHref: null,
      stateExplanation: null,
    };
  }

  const decisionLabel = formatApprovalStatus(input.approvalStatus);
  if (input.subjectType !== 'quote' || !input.partyId || !input.quoteId) {
    return {
      showContinue: true,
      decisionLabel,
      quoteLinkLabel: null,
      quoteHref: null,
      convertLabel: null,
      convertHref: null,
      stateExplanation: null,
    };
  }

  const href = quoteHref(input.partyId, input.quoteId);
  const quoteStatus = input.quoteStatus;

  if (quoteStatus === 'cancelled') {
    return {
      showContinue: true,
      decisionLabel,
      quoteLinkLabel: POST_APPROVAL_QUOTE_LINK_LABEL,
      quoteHref: href,
      convertLabel: null,
      convertHref: null,
      stateExplanation: POST_APPROVAL_CANCELLED_EXPLANATION,
    };
  }

  if (quoteStatus === 'draft' && input.approvalStatus === 'approved') {
    return {
      showContinue: true,
      decisionLabel,
      quoteLinkLabel: POST_APPROVAL_QUOTE_LINK_LABEL,
      quoteHref: href,
      convertLabel: null,
      convertHref: null,
      stateExplanation: POST_APPROVAL_ISSUE_NEXT_STEP,
    };
  }

  // Crear pedido needs the recorded customer acceptance (accepted), not an issued quote.
  const offerConvert = quoteStatus === 'accepted' && input.canConvertToOrder;
  if (offerConvert) {
    return {
      showContinue: true,
      decisionLabel,
      quoteLinkLabel: POST_APPROVAL_QUOTE_LINK_LABEL,
      quoteHref: href,
      convertLabel: POST_APPROVAL_CONVERT_LABEL,
      convertHref: quoteConvertHref(input.partyId, input.quoteId),
      stateExplanation: null,
    };
  }

  const statusLabel = quoteStatus ? formatQuoteStatus(quoteStatus) : null;
  const stateExplanation =
    quoteStatus === 'submitted'
      ? `Cotización ${statusLabel}. La aprobación no crea un pedido.`
      : statusLabel
        ? `Cotización ${statusLabel}. La aprobación no crea un pedido.`
        : 'La aprobación no crea un pedido.';

  return {
    showContinue: true,
    decisionLabel,
    quoteLinkLabel: POST_APPROVAL_QUOTE_LINK_LABEL,
    quoteHref: href,
    convertLabel: null,
    convertHref: null,
    stateExplanation,
  };
}
