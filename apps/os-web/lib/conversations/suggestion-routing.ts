/**
 * Human-confirmed navigation for conversation suggestions — never auto-mutates.
 */

import { newOpportunityHref, quoteHref, clienteSectionHref } from '@/lib/commercial/navigation';
import { reportIssueHref } from '@/lib/issue/navigation';
import type { Conversation } from './model';
import type { ConversationSuggestion } from './suggestion-types';

function isRealPartyId(partyId: string): boolean {
  return Boolean(partyId.trim()) && !partyId.startsWith('demo-party-');
}

function isRealRecordId(id: string | null | undefined): id is string {
  const value = id?.trim() ?? '';
  return Boolean(value) && !value.startsWith('demo-');
}

export function suggestionPrimaryActionHref(
  suggestion: ConversationSuggestion,
  conversation: Conversation,
): string {
  const partyId = conversation.partyId;
  const partyOk = isRealPartyId(partyId);

  switch (suggestion.type) {
    case 'possible_opportunity':
      return partyOk ? newOpportunityHref(partyId) : '/oportunidades';
    case 'possible_acceptance':
      if (partyOk && isRealRecordId(conversation.related.quoteId)) {
        return quoteHref(partyId, conversation.related.quoteId);
      }
      return partyOk ? clienteSectionHref(partyId, 'comercial') : '/cotizaciones';
    case 'possible_issue':
      return partyOk
        ? reportIssueHref({
            referenceType: 'party',
            referenceId: partyId,
            referenceLabel: conversation.partyLabel,
          })
        : '/incidencias/reportar';
    case 'possible_commitment':
      return partyOk ? clienteSectionHref(partyId, 'trabajo') : '/compromisos';
    case 'possible_follow_up':
      return partyOk ? clienteSectionHref(partyId, 'trabajo') : '/trabajo';
    case 'product_question':
    case 'delivery_question':
    case 'general_customer_question':
      return partyOk ? clienteSectionHref(partyId, 'comercial') : '/conversaciones';
    default:
      return partyOk ? `/clientes/${encodeURIComponent(partyId)}` : '/conversaciones';
  }
}

/** @deprecated Prefer durable company evidence via ignoreConversationSuggestionAction. */
export function ignoredSuggestionsStorageKey(conversationId: string): string {
  return `isalwa:conv-ignored:${conversationId}`;
}

/** Optimistic local cache only — durable source of truth is company-entered decision rows. */
export function readIgnoredSuggestionIds(conversationId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(ignoredSuggestionsStorageKey(conversationId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/** Optimistic local cache only — pair with durable ignoreConversationSuggestionAction. */
export function persistIgnoredSuggestionId(conversationId: string, suggestionId: string): Set<string> {
  const next = readIgnoredSuggestionIds(conversationId);
  next.add(suggestionId);
  try {
    sessionStorage.setItem(
      ignoredSuggestionsStorageKey(conversationId),
      JSON.stringify([...next]),
    );
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}
