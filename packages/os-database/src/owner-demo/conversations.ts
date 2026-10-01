/**
 * Owner-demo durable conversation admission — SYNTH fixtures only.
 * Seeds company-entered rows into os_customer_conversations.
 * Channel stays manual. WhatsApp is never connected.
 */
import {
  recordManualCustomerConversation,
  type CustomerConversationAdmission,
  type ManualCustomerConversation,
  type RecordCustomerConversationInput,
} from '@isalwa/os-contracts';
import type { OwnerDemoClientKey, OwnerDemoClientSpec, OwnerDemoConversationSpec } from './catalog';
import { assertOwnerDemoSynthOrg } from './guards';

/** Shared occurredAt for owner-demo conversation fixtures (matches demo JSON). */
export const OWNER_DEMO_CONVERSATION_OCCURRED_AT = '2026-09-16T15:00:00.000Z' as const;

export const OWNER_DEMO_CONVERSATION_ENTERED_BY_LABEL = 'Owner demo seed' as const;

export type OwnerDemoConversationLinks = {
  opportunityId: string | null;
  quoteId: string | null;
  orderId: string | null;
};

export function ownerDemoConversationNaturalKey(clientKey: OwnerDemoClientKey | string): string {
  return `owner-demo-conversation:${clientKey}`;
}

export function buildOwnerDemoConversationInput(args: {
  organizationId: string;
  client: OwnerDemoClientSpec;
  conversation: OwnerDemoConversationSpec;
  partyId: string;
  enteredByMemberId: string | null;
  links?: OwnerDemoConversationLinks;
}): RecordCustomerConversationInput {
  assertOwnerDemoSynthOrg(args.organizationId);
  const contactLabel = `${args.client.contact.givenName} ${args.client.contact.familyName}`.trim();
  const links = args.links ?? { opportunityId: null, quoteId: null, orderId: null };
  return {
    id: ownerDemoConversationNaturalKey(args.client.key),
    organizationId: args.organizationId,
    customerId: args.partyId,
    customerLabel: args.client.displayName,
    contactLabel: contactLabel || null,
    // Always manual — pasted evidence may mention WhatsApp; the provider stays disconnected.
    channel: 'manual',
    occurredAt: OWNER_DEMO_CONVERSATION_OCCURRED_AT,
    enteredByMemberId: args.enteredByMemberId,
    enteredByLabel: OWNER_DEMO_CONVERSATION_ENTERED_BY_LABEL,
    summary: args.conversation.summary,
    pastedEvidence: args.conversation.pastedEvidence,
    opportunityId: links.opportunityId,
    quoteId: links.quoteId,
    orderId: links.orderId,
    customerQuestion: args.conversation.customerQuestion,
    commitmentCandidate: null,
    possibleRequestedDate: null,
    nextAction: null,
  };
}

export function admitOwnerDemoConversation(args: {
  organizationId: string;
  client: OwnerDemoClientSpec;
  conversation: OwnerDemoConversationSpec;
  partyId: string;
  enteredByMemberId: string | null;
  links?: OwnerDemoConversationLinks;
}): CustomerConversationAdmission {
  return recordManualCustomerConversation(buildOwnerDemoConversationInput(args));
}

/** Prisma create payload for OsCustomerConversation (camelCase). */
export function ownerDemoConversationCreateData(
  record: ManualCustomerConversation,
  createdAt: string,
): {
  id: string;
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel: string | null;
  channel: string;
  occurredAt: Date;
  enteredByMemberId: string | null;
  enteredByLabel: string;
  summary: string;
  pastedEvidence: string | null;
  opportunityId: string | null;
  quoteId: string | null;
  orderId: string | null;
  customerQuestion: string | null;
  commitmentCandidate: string | null;
  possibleRequestedDate: Date | null;
  nextAction: string | null;
  source: string;
  provenance: string;
  advisorNumberStatus: string;
  createdAt: Date;
} {
  return {
    id: record.id,
    organizationId: record.organizationId,
    customerId: record.customerId,
    customerLabel: record.customerLabel,
    contactLabel: record.contactLabel,
    channel: record.channel,
    occurredAt: new Date(record.occurredAt),
    enteredByMemberId: record.enteredByMemberId,
    enteredByLabel: record.enteredByLabel,
    summary: record.summary,
    pastedEvidence: record.pastedEvidence,
    opportunityId: record.opportunityId,
    quoteId: record.quoteId,
    orderId: record.orderId,
    customerQuestion: record.customerQuestion,
    commitmentCandidate: record.commitmentCandidate,
    possibleRequestedDate: record.possibleRequestedDate
      ? new Date(`${record.possibleRequestedDate}T00:00:00.000Z`)
      : null,
    nextAction: record.nextAction,
    source: record.source,
    provenance: record.provenance,
    advisorNumberStatus: record.advisorNumberStatus,
    createdAt: new Date(createdAt),
  };
}
