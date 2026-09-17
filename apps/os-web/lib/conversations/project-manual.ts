/**
 * Project company-entered manual evidence into the Conversation thread model.
 * Pasted text becomes an inbound evidence bubble; the summary is outbound company note.
 */

import type { ManualCustomerConversation } from '@isalwa/os-contracts';
import {
  deriveAttention,
  mapEvidenceChannel,
  type Conversation,
  type ConversationMessage,
} from './model';

export function projectManualConversation(
  record: ManualCustomerConversation,
): Conversation {
  const channel = mapEvidenceChannel(record.channel);
  const messages: ConversationMessage[] = [];

  if (record.pastedEvidence?.trim()) {
    messages.push({
      id: `${record.id}:evidence`,
      conversationId: record.id,
      organizationId: record.organizationId,
      direction: 'inbound',
      channel,
      body: record.pastedEvidence.trim(),
      occurredAt: record.occurredAt,
      actorLabel: record.contactLabel,
      actorMemberId: null,
      externalMessageId: null,
      provenance: 'company_entered',
      isDemo: false,
    });
  }

  messages.push({
    id: `${record.id}:summary`,
    conversationId: record.id,
    organizationId: record.organizationId,
    direction: 'outbound',
    channel,
    body: record.summary,
    occurredAt: record.occurredAt,
    actorLabel: record.enteredByLabel,
    actorMemberId: record.enteredByMemberId,
    externalMessageId: null,
    provenance: 'company_entered',
    isDemo: false,
  });

  const related = {
    opportunityId: record.opportunityId,
    quoteId: record.quoteId,
    quoteNumber: null,
    orderId: record.orderId,
    issueId: null,
    workItemId: null,
  };

  const attention = deriveAttention({
    messages,
    opportunityId: record.opportunityId,
    customerQuestion: record.customerQuestion,
    commitmentCandidate: record.commitmentCandidate,
    nextAction: record.nextAction,
    summary: record.summary,
  });

  return {
    id: record.id,
    organizationId: record.organizationId,
    partyId: record.customerId,
    partyLabel: record.customerLabel,
    contactLabel: record.contactLabel,
    channel,
    preview: record.summary,
    lastOccurredAt: record.occurredAt,
    messages,
    related,
    attention,
    provenance: 'company_entered',
    isDemo: false,
    externalConversationId: null,
    enteredByLabel: record.enteredByLabel,
    nextAction: record.nextAction,
    customerQuestion: record.customerQuestion,
    commitmentCandidate: record.commitmentCandidate,
    responsible: null,
  };
}
