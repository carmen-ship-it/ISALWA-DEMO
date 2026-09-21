import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { WHATSAPP_NUMBER_PENDING } from '@isalwa/os-contracts';
import { MANUAL_CONVERSATION_COPY, admitManualConversation } from './manual-conversation';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '../../app/(app)/mensajes/page.tsx');

describe('manual conversation on Mensajes', () => {
  it('keeps Próximamente and says the channel is not connected', () => {
    const page = readFileSync(pagePath, 'utf8');
    assert.match(page, /CapabilityLockedState/);
    assert.match(page, /TOUR_TARGET\.messagesFuture/);
    assert.match(page, /ManualConversationPanel/);
    assert.match(MANUAL_CONVERSATION_COPY.channelClosed, /no está conectado/);
    assert.match(MANUAL_CONVERSATION_COPY.companyEntered, /registro que dejó la empresa/);
    assert.match(MANUAL_CONVERSATION_COPY.boundary, /No confirma un pago ni una entrega/);
    assert.equal(MANUAL_CONVERSATION_COPY.numberPending, 'Número corporativo pendiente');
    assert.doesNotMatch(JSON.stringify(MANUAL_CONVERSATION_COPY), /\+591|\d{7,}/);
  });

  it('requires a selected party and does not accept free-text customer or link ids', () => {
    const panel = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../components/conversations/manual-conversation-panel.tsx'),
      'utf8',
    );
    assert.match(panel, /ServerPartyTypeahead/);
    assert.match(panel, /listPartyCommercialLinks/);
    assert.match(panel, /SearchableSelect/);
    assert.match(panel, /!customerId\.trim\(\)/);
    assert.match(panel, /disabled=\{!actor \|\| !customerId\.trim\(\) \|\| submitting\}/);
    assert.doesNotMatch(panel, /name="customerId"/);
    assert.doesNotMatch(panel, /name="customerLabel"/);
    assert.doesNotMatch(panel, /name="opportunityId"/);
    assert.doesNotMatch(panel, /name="quoteId"/);
    assert.doesNotMatch(panel, /name="orderId"/);
    assert.match(MANUAL_CONVERSATION_COPY.linksNeedParty, /Primero seleccione un cliente/);
  });

  it('records evidence without a phone, a payment, or a delivery', () => {
    const admitted = admitManualConversation({
      id: 'conv-ui-1',
      organizationId: 'org-synthetic',
      customerId: 'party-synthetic',
      customerLabel: 'Fábrica El Alto',
      contactLabel: '',
      channel: 'whatsapp',
      occurredAt: '2026-09-14T15:00:00.000Z',
      enteredByMemberId: 'member-1',
      enteredByLabel: 'Ana',
      summary: 'Ya pagó y lo entregan mañana.',
      pastedEvidence: '',
      opportunityId: '',
      quoteId: '',
      orderId: '',
      customerQuestion: '',
      commitmentCandidate: '',
      possibleRequestedDate: '',
      nextAction: '',
    });

    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.advisorNumberStatus, WHATSAPP_NUMBER_PENDING);
    assert.equal(admitted.record.advisorPhone, null);
    assert.equal(admitted.record.paymentConfirmed, false);
    assert.equal(admitted.record.delivered, false);
    assert.equal(admitted.record.providerConnected, false);
  });
});
