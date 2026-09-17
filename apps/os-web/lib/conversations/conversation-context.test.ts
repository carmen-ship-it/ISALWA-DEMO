import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildConversationContextView } from './build-context-panel';
import { ownerDemoConversationFixtures, OWNER_DEMO_CONVERSATION_ORG_ID } from './demo-fixtures';
import { conversationProvenanceView } from './conversation-provenance';
import seededIds from '@/lib/demo/seeded-ids.json';

const seededClients = (seededIds.clients ?? []).map((client) => ({
  key: client.key,
  partyId: client.partyId,
  opportunityId: client.opportunityId,
  quoteId: client.quoteId,
  quoteNumber: client.quoteNumber,
  orderId: client.orderId,
  followUpWorkId: client.followUpWorkId,
}));

function fixtures() {
  return ownerDemoConversationFixtures(OWNER_DEMO_CONVERSATION_ORG_ID, seededClients);
}

function byLabel(fragment: string) {
  const hit = fixtures().find((c) => c.partyLabel.includes(fragment));
  assert.ok(hit, `missing fixture ${fragment}`);
  return hit!;
}

describe('conversation context + demo fixtures', () => {
  it('loads five SYNTH demo conversations for the fixture org only', () => {
    const all = fixtures();
    assert.equal(all.length, 5);
    assert.ok(all.every((c) => c.isDemo));
    assert.equal(ownerDemoConversationFixtures('other-org').length, 0);
  });

  it('wires ANDINA → possible opportunity with reply, who-to-ask, deep links', () => {
    const andina = byLabel('ANDINA');
    const view = buildConversationContextView({ conversation: andina });
    assert.ok(view.suggestions.some((s) => s.type === 'possible_opportunity'));
    assert.ok(view.recommendedReply?.body.includes('cotización'));
    assert.equal(view.whoToAsk.kind, 'assigned');
    assert.match(view.recomendacion, /oportunidad/i);
    assert.ok(view.informacionAConfirmar.some((r) => r.certainty === 'pending'));
    assert.ok(view.acciones.some((a) => a.label.includes('Cliente360')));
    assert.ok(view.acciones.some((a) => a.label.includes('oportunidad')));
  });

  it('wires PROYECTOS → quote acceptance with real quote deep link', () => {
    const proyectos = byLabel('PROYECTOS');
    const view = buildConversationContextView({ conversation: proyectos });
    assert.ok(view.suggestions.some((s) => s.type === 'possible_acceptance'));
    assert.ok(view.recommendedReply);
    assert.equal(view.whoToAsk.kind, 'assigned');
    assert.ok(proyectos.related.quoteId);
    assert.equal(proyectos.related.quoteNumber, 'Q-DEMO-001');
    assert.ok(view.acciones.some((a) => a.href.includes('/cotizaciones/')));
    assert.ok(view.informacionAConfirmar.some((r) => r.certainty === 'confirmed'));
  });

  it('surfaces delivery certainty buckets for Hotel Central', () => {
    const hotel = byLabel('HOTEL');
    const view = buildConversationContextView({ conversation: hotel });
    assert.ok(view.suggestions.some((s) => s.type === 'delivery_question'));
    assert.ok(view.informacionAConfirmar.some((r) => r.certainty === 'confirmed'));
    assert.ok(view.informacionAConfirmar.some((r) => r.certainty === 'not_recorded'));
    assert.ok(view.recommendedReply?.body.includes('llegada'));
    assert.equal(view.whoToAsk.kind, 'assigned');
    assert.ok(view.freshnessLabel);
    assert.ok(hotel.related.orderId);
    assert.ok(view.acciones.some((a) => a.label.includes('Pedido')));
  });

  it('wires FERRETERÍA → possible issue with create action', () => {
    const norte = byLabel('FERRETER');
    const view = buildConversationContextView({ conversation: norte });
    assert.ok(view.suggestions.some((s) => s.type === 'possible_issue'));
    assert.ok(view.recommendedReply?.body.includes('incidencia'));
    assert.equal(view.whoToAsk.kind, 'assigned');
    assert.ok(view.acciones.some((a) => a.label.includes('incidencia')));
  });

  it('wires MADERAS → normal follow-up with pedido deep link', () => {
    const maderas = byLabel('MADERAS');
    const view = buildConversationContextView({ conversation: maderas });
    assert.equal(maderas.attention.followUp, true);
    assert.ok(view.suggestions.some((s) => s.type === 'possible_follow_up'));
    assert.ok(view.recommendedReply?.body.includes('estado del pedido'));
    assert.equal(view.whoToAsk.kind, 'assigned');
    assert.ok(maderas.related.orderId);
    assert.ok(view.acciones.some((a) => a.label.includes('Pedido')));
    assert.match(view.recomendacion, /seguimiento/i);
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
