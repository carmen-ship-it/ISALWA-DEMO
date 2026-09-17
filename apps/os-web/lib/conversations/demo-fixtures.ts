/**
 * Project CT3-E owner-demo conversation JSON into Conversation models.
 * SYNTH-only fixtures; never claim live WhatsApp.
 */

import conversationsFixture from '@/lib/demo/conversations.json';
import {
  deriveAttention,
  type Conversation,
  type ConversationMessage,
} from './model';

type FixtureRow = {
  clientKey: string;
  displayName: string;
  pastedEvidence: string;
  customerQuestion?: string;
  expectedQuantity?: number;
  relatedQuoteNumber?: string;
  missingFacts?: string[];
  issueQuantity?: number;
};

const FIXTURE_ORG = (conversationsFixture as { organizationId: string }).organizationId;
const ROWS = (conversationsFixture as { conversations: FixtureRow[] }).conversations;

/** SYNTH org id for owner-demo conversation fixtures. */
export const OWNER_DEMO_CONVERSATION_ORG_ID = FIXTURE_ORG;

export function ownerDemoConversationFixtures(
  organizationId: string,
  partyIdByClientKey?: ReadonlyMap<string, string> | Record<string, string>,
): Conversation[] {
  if (organizationId.trim() !== FIXTURE_ORG) {
    return [];
  }

  const map =
    partyIdByClientKey instanceof Map
      ? partyIdByClientKey
      : new Map(Object.entries(partyIdByClientKey ?? {}));

  return ROWS.map((row) => {
    const id = `demo-conv-${row.clientKey}`;
    const occurredAt = '2026-09-16T15:00:00.000Z';
    const partyId = map.get(row.clientKey)?.trim() || `demo-party-${row.clientKey}`;
    const body = row.pastedEvidence.trim();
    const message: ConversationMessage = {
      id: `${id}:inbound`,
      conversationId: id,
      organizationId: FIXTURE_ORG,
      direction: 'inbound',
      channel: 'WHATSAPP',
      body,
      occurredAt,
      actorLabel: row.displayName,
      actorMemberId: null,
      externalMessageId: null,
      provenance: 'demo_fixture',
      isDemo: true,
    };

    const attention = deriveAttention({
      messages: [message],
      opportunityId: null,
      customerQuestion: row.customerQuestion ?? null,
      commitmentCandidate: null,
      nextAction: null,
      summary: body,
    });

    if (row.clientKey === 'constructora_andina') {
      attention.possibleOpportunity = true;
      attention.needsResponse = true;
    }
    if (row.clientKey === 'proyectos_del_sur') {
      attention.needsResponse = true;
    }
    if (row.clientKey === 'ferreteria_norte') {
      attention.possibleIssue = true;
      attention.needsResponse = true;
    }
    if (row.clientKey === 'hotel_central') {
      attention.needsResponse = true;
    }

    const conversation: Conversation = {
      id,
      organizationId: FIXTURE_ORG,
      partyId,
      partyLabel: row.displayName,
      contactLabel: null,
      channel: 'WHATSAPP',
      preview: body.slice(0, 120),
      lastOccurredAt: occurredAt,
      messages: [message],
      related: {
        opportunityId: null,
        quoteId: row.relatedQuoteNumber ? `demo-quote-${row.relatedQuoteNumber}` : null,
        orderId: null,
        issueId: null,
        workItemId: null,
      },
      attention,
      provenance: 'demo_fixture',
      isDemo: true,
      externalConversationId: null,
      enteredByLabel: null,
      nextAction: null,
      customerQuestion: row.customerQuestion ?? null,
      commitmentCandidate: null,
    };
    return conversation;
  });
}
