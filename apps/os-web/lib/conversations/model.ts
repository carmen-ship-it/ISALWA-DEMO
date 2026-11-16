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
  'VISIT',
  'IN_PERSON',
  'EMAIL',
  'OTHER',
] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];

export const CONVERSATION_DIRECTIONS = ['inbound', 'outbound'] as const;
export type ConversationDirection = (typeof CONVERSATION_DIRECTIONS)[number];

/**
 * Inbox filters (Batch 5). `unassigned` and `mine` read the stored assignment; the account
 * owner and any commitment owner are separate concepts and never decide these filters.
 * `needs_response` and `follow_up` come from the derived attention flags.
 */
export const CONVERSATION_FILTERS = [
  'all',
  'unassigned',
  'mine',
  'needs_response',
  'follow_up',
] as const;
export type ConversationFilter = (typeof CONVERSATION_FILTERS)[number];

export const CONVERSATION_FILTER_LABELS: Record<ConversationFilter, string> = {
  all: 'Todos',
  unassigned: 'Sin asignar',
  mine: 'Mis chats',
  needs_response: 'Por responder',
  follow_up: 'Seguimiento',
};

export type ConversationRelated = {
  opportunityId: string | null;
  quoteId: string | null;
  /** Human quote code when known (e.g. Q-DEMO-001); may differ from opaque quoteId. */
  quoteNumber: string | null;
  orderId: string | null;
  issueId: string | null;
  workItemId: string | null;
};

/** Canonical RESPONSABLE hint for Contexto ISALWA (demo or assigned). Never Cargo inference. */
export type ConversationResponsibleHint = {
  memberId: string;
  displayName: string;
  teamLabel: string | null;
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
  /** Why the company attended the customer (attention records); null for older records. */
  reason: string | null;
  /** Who took the conversation. Separate from account owner and commitment owner. */
  assignedMemberId: string | null;
  assignedLabel: string | null;
  /** Commitment created from the saved next step, when it exists. */
  nextStepCommitmentId: string | null;
  /** Assigned RESPONSABLE for who-to-ask; null when not yet recorded. */
  responsible: ConversationResponsibleHint | null;
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
      return 'Llamada';
    case 'VISIT':
      return 'Visita';
    case 'IN_PERSON':
      return 'Atención presencial';
    case 'EMAIL':
      return 'Correo';
    case 'OTHER':
      return 'Otro';
  }
}

export function mapEvidenceChannel(
  channel: ManualCustomerConversation['channel'],
): ConversationChannel {
  switch (channel) {
    case 'whatsapp':
      return 'WHATSAPP';
    case 'call':
      return 'PHONE';
    case 'visit':
      return 'VISIT';
    case 'in_person':
      return 'IN_PERSON';
    default:
      return 'OTHER';
  }
}

export function toEvidenceChannel(
  channel: ConversationChannel,
): ManualCustomerConversation['channel'] {
  switch (channel) {
    case 'WHATSAPP':
      return 'whatsapp';
    case 'PHONE':
      return 'call';
    case 'VISIT':
      return 'visit';
    case 'IN_PERSON':
      return 'in_person';
    default:
      return 'manual';
  }
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
  actorMemberId: string | null = null,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'unassigned':
      return !conversation.assignedMemberId;
    case 'mine':
      return Boolean(actorMemberId) && conversation.assignedMemberId === actorMemberId;
    case 'needs_response':
      return conversation.attention.needsResponse;
    case 'follow_up':
      return conversation.attention.followUp;
  }
}

export function filterConversations(
  conversations: readonly Conversation[],
  filter: ConversationFilter,
  actorMemberId: string | null = null,
): Conversation[] {
  return conversations.filter((item) => conversationMatchesFilter(item, filter, actorMemberId));
}

function conversationHaystack(item: Conversation): string {
  return [
    item.partyLabel,
    item.contactLabel,
    item.preview,
    item.reason,
    item.customerQuestion,
    item.nextAction,
    ...item.messages.map((message) => message.body),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
}

/**
 * Inbox search ("Buscar cliente, teléfono o conversación"). Text matches the customer,
 * contact and conversation words. A phone is not stored on a conversation, so the caller
 * resolves it through the authorized customer search and passes the matching customer ids.
 * An empty query shows everything.
 */
export function searchInbox(
  conversations: readonly Conversation[],
  query: string,
  customerIdsMatchingQuery: ReadonlySet<string> = new Set(),
): Conversation[] {
  const q = query.trim().toLocaleLowerCase('es');
  if (!q) return [...conversations];
  return conversations.filter(
    (item) => customerIdsMatchingQuery.has(item.partyId) || conversationHaystack(item).includes(q),
  );
}

export function searchConversations(
  conversations: readonly Conversation[],
  query: string,
): Conversation[] {
  const q = query.trim().toLocaleLowerCase('es');
  if (q.length < 2) return [];
  return conversations.filter((item) => conversationHaystack(item).includes(q));
}

export function conversationHref(conversationId: string): string {
  const id = conversationId.trim();
  if (!id) return '/conversaciones';
  return `/conversaciones?c=${encodeURIComponent(id)}`;
}
