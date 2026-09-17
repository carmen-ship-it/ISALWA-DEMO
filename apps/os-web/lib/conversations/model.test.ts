import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ManualCustomerConversation } from '@isalwa/os-contracts';
import {
  DEMO_WHATSAPP_BADGE,
  filterConversations,
  searchConversations,
  type Conversation,
} from './model';
import { projectManualConversation } from './project-manual';
import {
  createManualConversationAdapter,
  mergeConversationSources,
} from './adapters';
import { conversationPaletteItems } from './search';

function sampleManual(overrides: Partial<ManualCustomerConversation> = {}): ManualCustomerConversation {
  return {
    id: 'conv-1',
    organizationId: 'org-1',
    customerId: 'party-1',
    customerLabel: 'Fábrica Norte',
    contactLabel: 'Luis',
    channel: 'whatsapp',
    occurredAt: '2026-09-16T15:00:00.000Z',
    enteredByMemberId: 'member-1',
    enteredByLabel: 'Ana',
    summary: 'Pidió cotización de piso.',
    pastedEvidence: '¿Tienen stock esta semana?',
    opportunityId: 'opp-1',
    quoteId: null,
    orderId: null,
    customerQuestion: '¿Tienen stock esta semana?',
    commitmentCandidate: 'Llamar mañana',
    possibleRequestedDate: null,
    nextAction: 'Enviar cotización',
    source: 'employee_entered',
    provenance: 'company_entered',
    providerConnected: false,
    modelCalled: false,
    providerCalled: false,
    paymentConfirmed: false,
    stockConfirmed: false,
    delivered: false,
    productionComplete: false,
    discountApproved: false,
    approved: false,
    commitmentCreated: false,
    questionResolved: false,
    linkedRecordMutated: false,
    canonicalMutation: 'refused',
    advisorNumberStatus: 'WHATSAPP_NUMBER_PENDING',
    advisorPhone: null,
    ...overrides,
  };
}

describe('conversation model', () => {
  it('projects manual evidence into inbound/outbound bubbles without read ticks', () => {
    const conversation = projectManualConversation(sampleManual());
    assert.equal(conversation.channel, 'WHATSAPP');
    assert.equal(conversation.messages.length, 2);
    assert.equal(conversation.messages[0]?.direction, 'inbound');
    assert.equal(conversation.messages[1]?.direction, 'outbound');
    assert.equal(conversation.isDemo, false);
    assert.equal(conversation.attention.needsResponse, true);
    assert.equal(conversation.attention.followUp, true);
    assert.equal(conversation.attention.possibleOpportunity, true);
  });

  it('filters attention buckets in Spanish product labels', () => {
    const base = projectManualConversation(sampleManual());
    const issue = projectManualConversation(
      sampleManual({
        id: 'conv-issue',
        opportunityId: null,
        customerQuestion: null,
        commitmentCandidate: null,
        nextAction: null,
        pastedEvidence: null,
        summary: 'Reportaron una incidencia de entrega.',
      }),
    );
    assert.equal(filterConversations([base], 'needs_response').length, 1);
    assert.equal(filterConversations([base], 'follow_up').length, 1);
    assert.equal(filterConversations([base], 'possible_opportunity').length, 1);
    assert.equal(filterConversations([issue], 'possible_issue').length, 1);
    assert.equal(filterConversations([base], 'possible_issue').length, 0);
  });

  it('search and palette hook find conversations without claiming live WhatsApp', () => {
    const conversation = projectManualConversation(sampleManual());
    const hits = searchConversations([conversation], 'fábrica');
    assert.equal(hits.length, 1);
    const items = conversationPaletteItems([conversation], 'stock');
    assert.equal(items[0]?.href, '/conversaciones?c=conv-1');
    assert.doesNotMatch(items[0]?.detail ?? '', /en vivo|live whatsapp/i);
  });

  it('demo merge keeps DEMO·WHATSAPP identity separate from company-entered records', () => {
    const recorded = projectManualConversation(sampleManual());
    const demo: Conversation = {
      ...recorded,
      id: 'demo-1',
      isDemo: true,
      provenance: 'demo_fixture',
      preview: 'Ejemplo demo',
    };
    const merged = mergeConversationSources({
      organizationId: 'org-1',
      recorded: [recorded],
      fixtures: [demo],
    });
    assert.equal(merged.length, 2);
    assert.equal(merged.find((item) => item.isDemo)?.id, 'demo-1');
    assert.equal(DEMO_WHATSAPP_BADGE, 'DEMO·WHATSAPP');
  });

  it('manual adapter never sends', async () => {
    const conversation = projectManualConversation(sampleManual());
    const adapter = createManualConversationAdapter(() => [conversation]);
    assert.equal(adapter.capability.live, false);
    const sent = await adapter.send({
      organizationId: 'org-1',
      conversationId: 'conv-1',
      body: 'hola',
    });
    assert.deepEqual(sent, { sent: false, reason: 'provider_not_connected' });
  });
});
