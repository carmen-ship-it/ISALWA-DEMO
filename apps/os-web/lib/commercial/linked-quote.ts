import { preferredLinkedQuote, type OpportunityLinkedQuote } from './next-step';

/**
 * A quote row already loaded for an opportunity detail lookup.
 * Selection never invents a quote; it only chooses among these rows.
 */
export type LinkedQuoteCandidate = OpportunityLinkedQuote & {
  quoteNumber: string;
};

export type SelectedLinkedQuote = {
  quoteId: string;
  quoteNumber: string;
  partyId: string;
  opportunityId: string;
  status: string | null;
};

/**
 * Linked quote for this opportunity only.
 * Blank or other opportunity ids are not this opportunity.
 * Status order is preferredLinkedQuote: submitted/accepted, then draft, then any remaining match.
 */
export function selectLinkedQuote(
  quotes: readonly LinkedQuoteCandidate[] | null | undefined,
  opportunityId: string,
): SelectedLinkedQuote | null {
  const preferred = preferredLinkedQuote(quotes, opportunityId);
  if (!preferred || preferred.opportunityId !== opportunityId) return null;

  const match =
    (quotes ?? []).find(
      (item) =>
        item.quoteId === preferred.quoteId && item.opportunityId === opportunityId,
    ) ?? null;
  const quoteNumber = match?.quoteNumber.trim() ?? '';
  if (!quoteNumber) return null;

  return {
    quoteId: preferred.quoteId,
    quoteNumber,
    partyId: preferred.partyId,
    opportunityId,
    status: match?.status?.trim() || preferred.status?.trim() || null,
  };
}
