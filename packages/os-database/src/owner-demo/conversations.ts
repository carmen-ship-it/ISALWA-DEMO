/**
 * Owner-demo durable conversation admission helpers (pure; no DB I/O).
 * Channel stays manual — story text may mention WhatsApp evidence without connecting a provider.
 */

import {
  recordManualCustomerConversation,
  type ManualCustomerConversation,
  type RecordCustomerConversationInput,
} from '@isalwa/os-contracts';
import {
  OWNER_DEMO_CLIENTS,
  OWNER_DEMO_CONVERSATIONS,
  type OwnerDemoClientKey,
  type OwnerDemoClientSpec,
  type OwnerDemoConversationSpec,
} from './catalog';
import { assertOwnerDemoSynthOrg, OWNER_DEMO_SYNTH_ORG } from './guards';

export const OWNER_DEMO_CONVERSATION_OCCURRED_AT = '2026-09-16T15:00:00.000Z' as const;
export const OWNER_DEMO_CONVERSATION_ENTERED_BY_LABEL = 'Owner demo seed' as const;

/** Expected OsCustomerConversation rows from owner-demo seed (one per DEMO client). */
export const OWNER_DEMO_CONVERSATION_SEED_COUNT = 5 as const;

export type OwnerDemoConversationLinks = {
  opportunityId: string | null;
  quoteId: string | null;
  orderId: string | null;
};

export function ownerDemoConversationNaturalKey(clientKey: OwnerDemoClientKey): string {
  return `owner-demo-conversation:${clientKey}`;
}

export type OwnerDemoConversationSeedPlanRow = {
  clientKey: OwnerDemoClientKey;
  displayName: string;
  conversationId: string;
  summary: string;
};

/**
 * Dry-run plan for durable conversation seed — no DB I/O.
 * Matches what `ensureOwnerDemoConversation` writes for each DEMO client.
 */
export function planOwnerDemoConversationSeeds(): OwnerDemoConversationSeedPlanRow[] {
  const rows: OwnerDemoConversationSeedPlanRow[] = [];
  for (const client of OWNER_DEMO_CLIENTS) {
    const conversation = OWNER_DEMO_CONVERSATIONS.find((c) => c.clientKey === client.key);
    if (!conversation) {
      throw new Error(`OWNER_DEMO_CONVERSATION_MISSING:${client.key}`);
    }
    rows.push({
      clientKey: client.key,
      displayName: client.displayName,
      conversationId: ownerDemoConversationNaturalKey(client.key),
      summary: conversation.summary,
    });
  }
  if (rows.length !== OWNER_DEMO_CONVERSATION_SEED_COUNT) {
    throw new Error(
      `OWNER_DEMO_CONVERSATION_SEED_COUNT_MISMATCH:expected=${OWNER_DEMO_CONVERSATION_SEED_COUNT} got=${rows.length}`,
    );
  }
  return rows;
}

export function buildOwnerDemoConversationInput(args: {
  organizationId: string;
  client: OwnerDemoClientSpec;
  conversation: OwnerDemoConversationSpec;
  partyId: string;
  enteredByMemberId: string | null;
  links: OwnerDemoConversationLinks;
}): RecordCustomerConversationInput {
  assertOwnerDemoSynthOrg(args.organizationId);
  return {
    id: ownerDemoConversationNaturalKey(args.client.key),
    organizationId: args.organizationId,
    customerId: args.partyId,
    customerLabel: args.client.displayName,
    contactLabel: `${args.client.contact.givenName} ${args.client.contact.familyName}`.trim(),
    // Manual channel even when pasted evidence mentions WhatsApp — no provider claim.
    channel: 'manual',
    occurredAt: OWNER_DEMO_CONVERSATION_OCCURRED_AT,
    enteredByMemberId: args.enteredByMemberId,
    enteredByLabel: OWNER_DEMO_CONVERSATION_ENTERED_BY_LABEL,
    summary: args.conversation.summary,
    pastedEvidence: args.conversation.pastedEvidence,
    opportunityId: args.links.opportunityId,
    quoteId: args.links.quoteId,
    orderId: args.links.orderId,
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
  links: OwnerDemoConversationLinks;
}): { ok: true; record: ManualCustomerConversation } | { ok: false; reason: string } {
  const input = buildOwnerDemoConversationInput(args);
  const admitted = recordManualCustomerConversation(input);
  if (!admitted.ok) return { ok: false, reason: admitted.reason };
  return admitted;
}

/** Prisma create payload from an admitted manual record. */
export function ownerDemoConversationCreateData(
  record: ManualCustomerConversation,
  createdAtIso: string,
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
    organizationId: record.organizationId || OWNER_DEMO_SYNTH_ORG,
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
    createdAt: new Date(createdAtIso),
  };
}
