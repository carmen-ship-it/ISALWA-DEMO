/**
 * Cliente 360 → Preparar cotización.
 * A quote is born from an opportunity of this customer. This picks the existing path from
 * data the page already loaded. It never creates an opportunity, a quote or a Sale, and
 * never guesses between several open opportunities.
 */

import type { FetchOutcome } from '@/lib/commercial/fetch-outcome';
import {
  clienteSectionHref,
  newOpportunityHref,
  newQuoteHref,
  quoteHref,
} from '@/lib/commercial/navigation';
import type { OpportunityListResponse } from '@/lib/commercial/types';
import { QUOTE_LIFECYCLE_LABELS } from '@/lib/commercial/quote-lifecycle';

export type PrepareQuoteTarget = {
  label: string;
  href: string;
  /** One honest line on where the link goes. */
  hint: string;
  kind: 'new-quote' | 'continue-draft' | 'choose-opportunity' | 'new-opportunity';
};

type LinkedQuote = {
  quoteId: string;
  opportunityId: string | null;
  status?: string;
};

export function prepareQuoteTarget(input: {
  partyId: string;
  opportunities: FetchOutcome<OpportunityListResponse>;
  linkedQuotes?: readonly LinkedQuote[];
}): PrepareQuoteTarget {
  const label = QUOTE_LIFECYCLE_LABELS.prepare;
  const { partyId } = input;
  const chooseHref = clienteSectionHref(partyId, 'comercial');

  if (input.opportunities.status !== 'ok') {
    return {
      label,
      href: chooseHref,
      hint: 'No se pudo leer las oportunidades. Elija la oportunidad en Comercial.',
      kind: 'choose-opportunity',
    };
  }

  const open = input.opportunities.data.items.filter((item) => item.status === 'open');
  if (open.length === 0) {
    return {
      label,
      href: newOpportunityHref(partyId),
      hint: 'Este cliente no tiene una oportunidad abierta. Primero registre la oportunidad; desde ahí se prepara la cotización.',
      kind: 'new-opportunity',
    };
  }
  if (open.length > 1) {
    return {
      label,
      href: chooseHref,
      hint: 'Hay varias oportunidades abiertas. Elija la oportunidad en Comercial.',
      kind: 'choose-opportunity',
    };
  }

  const opportunity = open[0];
  const draft = (input.linkedQuotes ?? []).find(
    (quote) => quote.opportunityId === opportunity.opportunityId && quote.status === 'draft',
  );
  if (draft) {
    return {
      label,
      href: quoteHref(partyId, draft.quoteId),
      hint: 'La oportunidad abierta ya tiene un borrador. Se continúa ese borrador.',
      kind: 'continue-draft',
    };
  }
  return {
    label,
    href: newQuoteHref(partyId, opportunity.opportunityId),
    hint: 'Abre una cotización nueva para la oportunidad abierta de este cliente.',
    kind: 'new-quote',
  };
}
