/**
 * Conversation provenance helpers for Work / Issue / Opportunity / Commitment surfaces.
 * UI consumers (ConversationOriginLine) live under PF-3; this module is the shared domain contract.
 */

import { conversationHref } from '@/lib/conversations/model';
import {
  CONVERSATION_ORIGIN_COPY,
  humanizeConversationOriginEvent,
} from '@/lib/audit/humanize';

export type ConversationProvenanceKind =
  | 'opportunity'
  | 'issue'
  | 'follow_up'
  | 'commitment';

export type ConversationProvenanceRef = {
  conversationId: string;
  partyLabel?: string | null;
  contactLabel?: string | null;
  occurredAt?: string | null;
  kind?: ConversationProvenanceKind | null;
};

export function conversationProvenanceView(ref: ConversationProvenanceRef | null | undefined): {
  origenLabel: string;
  eventLabel: string | null;
  verLabel: string;
  href: string;
  partyLabel: string | null;
  contactLabel: string | null;
  occurredAt: string | null;
} | null {
  const id = ref?.conversationId?.trim();
  if (!id) return null;
  const kind = ref?.kind ?? null;
  return {
    origenLabel: CONVERSATION_ORIGIN_COPY.origen,
    eventLabel: kind ? humanizeConversationOriginEvent(kind) : null,
    verLabel: CONVERSATION_ORIGIN_COPY.verConversacion,
    href: conversationHref(id),
    partyLabel: ref?.partyLabel?.trim() || null,
    contactLabel: ref?.contactLabel?.trim() || null,
    occurredAt: ref?.occurredAt?.trim() || null,
  };
}

/** Extract conversation origin from BusinessEvent / timeline facts when durable. */
export function conversationIdFromFacts(facts: Record<string, unknown> | null | undefined): string | null {
  if (!facts) return null;
  const raw = facts.conversationId ?? facts.sourceConversationId;
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  return id || null;
}

export function provenanceKindFromEventType(
  eventType: string,
): ConversationProvenanceKind | null {
  switch (eventType.trim()) {
    case 'opportunity.created_from_conversation':
      return 'opportunity';
    case 'issue.created_from_conversation':
      return 'issue';
    case 'commitment.created_from_conversation':
      return 'commitment';
    case 'work_item.created_from_conversation':
    case 'follow_up.created_from_conversation':
      return 'follow_up';
    default:
      return null;
  }
}
