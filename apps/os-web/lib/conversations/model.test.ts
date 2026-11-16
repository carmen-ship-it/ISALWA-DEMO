import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ManualCustomerConversation } from '@isalwa/os-contracts';
import {
  CONVERSATION_FILTER_LABELS,
  CONVERSATION_FILTERS,
  channelLabel,
  filterConversations,
  mapEvidenceChannel,
  searchConversations,
  searchInbox,
  toEvidenceChannel,
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
    reason: null,
    assignedMemberId: null,
    assignedLabel: null,
    assignedAt: null,
    nextStepCommitmentId: null,
    nextStep: null,
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

  it('offers exactly the Batch 5 inbox filters with their Spanish labels', () => {
    assert.deepEqual(
      CONVERSATION_FILTERS.map((filter) => CONVERSATION_FILTER_LABELS[filter]),
      ['Todos', 'Sin asignar', 'Mis chats', 'Por responder', 'Seguimiento'],
    );
  });

  it('filters by assignment, response and follow-up without using the account owner', () => {
    const open = projectManualConversation(sampleManual({ id: 'conv-open' }));
    const mine = projectManualConversation(
      sampleManual({ id: 'conv-mine', assignedMemberId: 'member-1', assignedLabel: 'Ana', assignedAt: '2026-11-16T15:00:00.000Z' }),
    );
    const theirs = projectManualConversation(
      sampleManual({ id: 'conv-theirs', assignedMemberId: 'member-2', assignedLabel: 'Luis', assignedAt: '2026-11-16T15:00:00.000Z' }),
    );
    const quiet = projectManualConversation(
      sampleManual({
        id: 'conv-quiet',
        customerQuestion: null,
        commitmentCandidate: null,
        nextAction: null,
        pastedEvidence: null,
        opportunityId: null,
      }),
    );
    const all = [open, mine, theirs, quiet];
    const ids = (rows: readonly Conversation[]) => rows.map((row) => row.id).sort();

    assert.deepEqual(ids(filterConversations(all, 'all', 'member-1')), ids(all));
    assert.deepEqual(ids(filterConversations(all, 'unassigned', 'member-1')), ['conv-open', 'conv-quiet']);
    assert.deepEqual(ids(filterConversations(all, 'mine', 'member-1')), ['conv-mine']);
    // Without a signed-in member nothing is "mine"; other people's chats never leak in.
    assert.deepEqual(ids(filterConversations(all, 'mine', null)), []);
    assert.deepEqual(ids(filterConversations(all, 'needs_response', 'member-1')), ['conv-mine', 'conv-open', 'conv-theirs']);
    assert.deepEqual(ids(filterConversations(all, 'follow_up', 'member-1')), ['conv-mine', 'conv-open', 'conv-theirs']);
  });

  it('inbox search matches customer, contact, conversation words and phone-matched customers', () => {
    const a = projectManualConversation(sampleManual({ id: 'a', customerLabel: 'Fábrica Norte', customerId: 'party-a' }));
    const b = projectManualConversation(
      sampleManual({
        id: 'b',
        customerLabel: 'Maderas Sur',
        customerId: 'party-b',
        contactLabel: 'Elena',
        reason: 'Consulta de plazo',
        summary: 'Pidió plazo',
        pastedEvidence: null,
        customerQuestion: null,
      }),
    );
    assert.equal(searchInbox([a, b], '').length, 2);
    assert.deepEqual(searchInbox([a, b], 'maderas').map((row) => row.id), ['b']);
    assert.deepEqual(searchInbox([a, b], 'ELENA').map((row) => row.id), ['b']);
    assert.deepEqual(searchInbox([a, b], 'plazo').map((row) => row.id), ['b']);
    assert.deepEqual(searchInbox([a, b], 'stock').map((row) => row.id), ['a']);
    // A phone is not in the conversation: the authorized customer search supplies the ids.
    assert.deepEqual(searchInbox([a, b], '70000001').map((row) => row.id), []);
    assert.deepEqual(searchInbox([a, b], '70000001', new Set(['party-a'])).map((row) => row.id), ['a']);
  });

  it('maps every attention channel to a presentation channel and back', () => {
    for (const [stored, shown, label] of [
      ['call', 'PHONE', 'Llamada'],
      ['visit', 'VISIT', 'Visita'],
      ['in_person', 'IN_PERSON', 'Atención presencial'],
      ['whatsapp', 'WHATSAPP', 'WhatsApp'],
      ['manual', 'OTHER', 'Otro'],
    ] as const) {
      assert.equal(mapEvidenceChannel(stored), shown);
      assert.equal(toEvidenceChannel(shown), stored);
      assert.equal(channelLabel(shown), label);
    }
  });

  it('projects reason, assignment and the next-step link into the thread model', () => {
    const conversation = projectManualConversation(
      sampleManual({
        channel: 'call',
        reason: 'Consulta por plazo',
        assignedMemberId: 'member-1',
        assignedLabel: 'Ana',
        assignedAt: '2026-11-16T15:00:00.000Z',
        nextStepCommitmentId: 'commitment-1',
      }),
    );
    assert.equal(conversation.channel, 'PHONE');
    assert.equal(conversation.reason, 'Consulta por plazo');
    assert.equal(conversation.assignedMemberId, 'member-1');
    assert.equal(conversation.assignedLabel, 'Ana');
    assert.equal(conversation.nextStepCommitmentId, 'commitment-1');
  });

  it('search and palette hook find conversations without claiming live WhatsApp', () => {
    const conversation = projectManualConversation(sampleManual());
    const hits = searchConversations([conversation], 'fábrica');
    assert.equal(hits.length, 1);
    const items = conversationPaletteItems([conversation], 'stock');
    assert.equal(items[0]?.href, '/conversaciones?c=conv-1');
    assert.doesNotMatch(items[0]?.detail ?? '', /en vivo|live whatsapp/i);
  });

  it('merge keeps server rows and newly recorded rows for the organization only', () => {
    const recorded = projectManualConversation(sampleManual());
    const server: Conversation = { ...recorded, id: 'server-1', preview: 'Registrada antes' };
    const otherOrg: Conversation = { ...recorded, id: 'other-1', organizationId: 'org-2' };
    const merged = mergeConversationSources({
      organizationId: 'org-1',
      recorded: [recorded],
      initial: [server, otherOrg],
    });
    assert.deepEqual(merged.map((item) => item.id).sort(), [recorded.id, 'server-1'].sort());
    assert.equal(merged.some((item) => item.isDemo), false);
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
