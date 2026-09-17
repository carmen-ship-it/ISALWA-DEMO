/**
 * Provider-neutral conversation presentation model.
 * Reuses ManualCustomerConversation / OsCustomerConversation for company-entered evidence.
 * Does not couple to Meta, Twilio, or any live messaging vendor.
 * Demo threads are labeled DEMO·WHATSAPP and never claim a live channel.
 */

import type { ManualCustomerConversation } from '@isalwa/os-contracts';

export const CONVERSATION_CHANNELS = [
  'WHATSAPP',
  'PHONE',
  'IN_PERSON',
  'EMAIL',
  'OTHER',
] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];

export const CONVERSATION_DIRECTIONS = ['inbound', 'outbound'] as const;
export type ConversationDirection = (typeof CONVERSATION_DIRECTIONS)[number];

export const CONVERSATION_FILTERS = [
  'all',
  'needs_response',
  'follow_up',
  'possible_opportunity',
  'possible_issue',
] as const;
export type ConversationFilter = (typeof CONVERSATION_FILTERS)[number];

export const CONVERSATION_FILTER_LABELS: Record<ConversationFilter, string> = {
  all: 'Todas',
  needs_response: 'Necesitan respuesta',
  follow_up: 'Seguimiento',
  possible_opportunity: 'Oportunidad posible',
  possible_issue: 'Incidencia posible',
};

export const DEMO_WHATSAPP_BADGE = 'DEMO·WHATSAPP' as const;
export const DEMO_WHATSAPP_BANNER =
  'Hilo de demostración. WhatsApp no está conectado. No es un canal en vivo.' as const;

export type ConversationRelated = {
  opportunityId: string | null;
  quoteId: string | null;
  orderId: string | null;
  issueId: string | null;
  workItemId: string | null;
};

export type ConversationProvenance =
  | 'company_entered'
  | 'demo_fixture'
  | 'provider_import'
  | 'unknown';

export type ConversationMessage = {
  id: string;
  conversationId: string;
  organizationId: string;
  direction: ConversationDirection;
  channel: ConversationChannel;
  body: string;
  occurredAt: string;
  actorLabel: string | null;
  actorMemberId: string | null;
  /** Optional opaque provider id. Never implies a live connection. */
  externalMessageId: string | null;
  provenance: ConversationProvenance;
  isDemo: boolean;
};

export type ConversationAttention = {
  needsResponse: boolean;
  followUp: boolean;
  possibleOpportunity: boolean;
  possibleIssue: boolean;
};

export type Conversation = {
  id: string;
  organizationId: string;
  partyId: string;
  partyLabel: string;
  contactLabel: string | null;
  channel: ConversationChannel;
  preview: string;
  lastOccurredAt: string;
  messages: readonly ConversationMessage[];
  related: ConversationRelated;
  attention: ConversationAttention;
  provenance: ConversationProvenance;
  isDemo: boolean;
  /** Optional opaque provider conversation id. Never implies a live connection. */
  externalConversationId: string | null;
  enteredByLabel: string | null;
  nextAction: string | null;
  customerQuestion: string | null;
  commitmentCandidate: string | null;
};

export type ConversationContextHooks = {
  cliente: unknown | null;
  comercial: unknown | null;
  operacion: unknown | null;
  trabajo: unknown | null;
  informacionAConfirmar: unknown | null;
  recomendacion: unknown | null;
  acciones: unknown | null;
};

/** Stub slots for CT3-D smart context. Layout owns the shell; content stays empty until wired. */
export function emptyConversationContextHooks(): ConversationContextHooks {
  return {
    cliente: null,
    comercial: null,
    operacion: null,
    trabajo: null,
    informacionAConfirmar: null,
    recomendacion: null,
    acciones: null,
  };
}

export function channelLabel(channel: ConversationChannel): string {
  switch (channel) {
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'PHONE':
      return 'Teléfono';
    case 'IN_PERSON':
      return 'En persona';
    case 'EMAIL':
      return 'Correo';
    case 'OTHER':
      return 'Otro';
  }
}

export function mapEvidenceChannel(
  channel: ManualCustomerConversation['channel'],
): ConversationChannel {
  return channel === 'whatsapp' ? 'WHATSAPP' : 'OTHER';
}

export function toEvidenceChannel(
  channel: ConversationChannel,
): ManualCustomerConversation['channel'] {
  return channel === 'WHATSAPP' ? 'whatsapp' : 'manual';
}

const ISSUE_HINT =
  /\b(incidencia|problema|reclamo|queja|falla|error|roto|demora|retraso)\b/i;

export function deriveAttention(input: {
  messages: readonly ConversationMessage[];
  opportunityId: string | null;
  customerQuestion: string | null;
  commitmentCandidate: string | null;
  nextAction: string | null;
  summary?: string | null;
}): ConversationAttention {
  const last = input.messages[input.messages.length - 1];
  const needsResponse =
    Boolean(input.customerQuestion?.trim()) || last?.direction === 'inbound';
  const followUp =
    Boolean(input.nextAction?.trim()) || Boolean(input.commitmentCandidate?.trim());
  const possibleOpportunity = Boolean(input.opportunityId?.trim());
  const haystack = [input.summary, input.customerQuestion, last?.body]
    .filter(Boolean)
    .join(' ');
  const possibleIssue = ISSUE_HINT.test(haystack);
  return { needsResponse, followUp, possibleOpportunity, possibleIssue };
}

export function conversationMatchesFilter(
  conversation: Conversation,
  filter: ConversationFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'needs_response':
      return conversation.attention.needsResponse;
    case 'follow_up':
      return conversation.attention.followUp;
    case 'possible_opportunity':
      return conversation.attention.possibleOpportunity;
    case 'possible_issue':
      return conversation.attention.possibleIssue;
  }
}

export function filterConversations(
  conversations: readonly Conversation[],
  filter: ConversationFilter,
): Conversation[] {
  return conversations.filter((item) => conversationMatchesFilter(item, filter));
}

export function searchConversations(
  conversations: readonly Conversation[],
  query: string,
): Conversation[] {
  const q = query.trim().toLocaleLowerCase('es');
  if (q.length < 2) return [];
  return conversations.filter((item) => {
    const haystack = [
      item.partyLabel,
      item.contactLabel,
      item.preview,
      item.customerQuestion,
      item.nextAction,
      ...item.messages.map((message) => message.body),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('es');
    return haystack.includes(q);
  });
}

export function conversationHref(conversationId: string): string {
  const id = conversationId.trim();
  if (!id) return '/conversaciones';
  return `/conversaciones?c=${encodeURIComponent(id)}`;
}
