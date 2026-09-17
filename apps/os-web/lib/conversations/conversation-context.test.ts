import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildConversationContextView } from './build-context-panel';
import { ownerDemoConversationFixtures, OWNER_DEMO_CONVERSATION_ORG_ID } from './demo-fixtures';
import { conversationProvenanceView } from './conversation-provenance';

describe('conversation context + demo fixtures', () => {
  it('loads five SYNTH demo conversations for the fixture org only', () => {
    const fixtures = ownerDemoConversationFixtures(OWNER_DEMO_CONVERSATION_ORG_ID);
    assert.equal(fixtures.length, 5);
    assert.ok(fixtures.every((c) => c.isDemo));
    assert.equal(ownerDemoConversationFixtures('other-org').length, 0);
  });

  it('wires suggestions and certainty for Constructora Andina', () => {
    const andina = ownerDemoConversationFixtures(OWNER_DEMO_CONVERSATION_ORG_ID).find((c) =>
      c.partyLabel.includes('ANDINA'),
    );
    assert.ok(andina);
    const view = buildConversationContextView({ conversation: andina! });
    assert.ok(view.suggestions.some((s) => s.type === 'possible_opportunity'));
    assert.ok(view.recommendedReply?.body.includes('cotización'));
    assert.equal(view.whoToAsk.kind, 'absent');
  });

  it('surfaces delivery certainty buckets for Hotel Central', () => {
    const hotel = ownerDemoConversationFixtures(OWNER_DEMO_CONVERSATION_ORG_ID).find((c) =>
      c.partyLabel.includes('HOTEL'),
    );
    assert.ok(hotel);
    const view = buildConversationContextView({ conversation: hotel! });
    assert.ok(view.informacionAConfirmar.some((r) => r.certainty === 'confirmed'));
    assert.ok(view.informacionAConfirmar.some((r) => r.certainty === 'not_recorded'));
    assert.ok(view.freshnessLabel);
  });

  it('builds Origen Conversación provenance link without opaque provider IDs', () => {
    const view = conversationProvenanceView({
      conversationId: 'demo-conv-andina',
      partyLabel: 'DEMO CONSTRUCTORA ANDINA',
    });
    assert.equal(view?.origenLabel, 'Origen: Conversación');
    assert.equal(view?.verLabel, 'Ver conversación');
    assert.match(view?.href ?? '', /conversaciones/);
    assert.doesNotMatch(view?.href ?? '', /twilio|meta|provider/i);
  });
});
