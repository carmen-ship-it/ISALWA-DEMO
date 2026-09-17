/**
 * Conversation provenance helpers for Work / Issue / Opportunity / Commitment surfaces.
 */

import { conversationHref } from '@/lib/conversations/model';
import { CONVERSATION_ORIGIN_COPY } from '@/lib/audit/humanize';

export type ConversationProvenanceRef = {
  conversationId: string;
  partyLabel?: string | null;
  contactLabel?: string | null;
  occurredAt?: string | null;
};

export function conversationProvenanceView(ref: ConversationProvenanceRef | null | undefined): {
  origenLabel: string;
  verLabel: string;
  href: string;
  partyLabel: string | null;
  contactLabel: string | null;
  occurredAt: string | null;
} | null {
  const id = ref?.conversationId?.trim();
  if (!id) return null;
  return {
    origenLabel: CONVERSATION_ORIGIN_COPY.origen,
    verLabel: CONVERSATION_ORIGIN_COPY.verConversacion,
    href: conversationHref(id),
    partyLabel: ref?.partyLabel?.trim() || null,
    contactLabel: ref?.contactLabel?.trim() || null,
    occurredAt: ref?.occurredAt?.trim() || null,
  };
}
