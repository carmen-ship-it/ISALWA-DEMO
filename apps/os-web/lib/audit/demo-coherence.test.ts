import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_MADERAS_DISPLAY_NAME,
  DEMO_MADERAS_EXPECTED_LOOP_EVENT_TYPES,
  auditQueryMatchesDemoIntent,
  demoMaderasCoherenceLinks,
  findDemoMaderasClient,
} from './demo-coherence';
import { loadDemoSeedIdMap } from '@/lib/demo/owner-demo-registry';
import {
  auditResourceHref,
  auditResourceHrefForEntry,
  partyIdFromAuditSnapshot,
} from './resource-href';
import { presentAuditActionLabel, presentAuditResourceLabel } from './present';
import { auditResourceTypeOptions, auditActionOptions } from './filter-options';
import {
  conversationIdFromFacts,
  conversationProvenanceView,
  provenanceKindFromEventType,
} from '@/lib/conversations/conversation-provenance';

describe('DEMO MADERAS cross-page coherence', () => {
  it('links Quote ↔ Pedido ↔ Cliente360 ↔ Audit with the same seeded ids', () => {
    const map = loadDemoSeedIdMap();
    const maderas = findDemoMaderasClient(map);
    assert.ok(maderas, 'seeded-ids must include maderas_oriente');
    assert.equal(maderas.key, 'maderas_oriente');
    assert.ok(maderas.partyId);
    assert.ok(maderas.quoteId);
    assert.ok(maderas.orderId);
    assert.equal(maderas.quoteNumber, 'Q-000002');

    const links = demoMaderasCoherenceLinks(map);
    assert.ok(links);
    assert.equal(links.displayName, DEMO_MADERAS_DISPLAY_NAME);
    assert.equal(links.partyId, maderas.partyId);
    assert.equal(links.quoteId, maderas.quoteId);
    assert.equal(links.orderId, maderas.orderId);

    assert.match(links.cliente360, new RegExp(maderas.partyId));
    assert.match(links.clienteHistorial, /tab=historial/);
    assert.match(links.clienteHistorial, new RegExp(maderas.partyId));
    assert.match(links.clienteDocumentos, /tab=documentos/);

    assert.ok(links.quote);
    assert.match(links.quote!, new RegExp(maderas.partyId));
    assert.match(links.quote!, new RegExp(maderas.quoteId!));
    assert.match(links.quote!, /cotizaciones/);

    assert.ok(links.order);
    assert.match(links.order!, new RegExp(maderas.partyId));
    assert.match(links.order!, new RegExp(maderas.orderId!));
    assert.match(links.order!, /pedidos/);

    assert.match(links.auditPresets.maderasParty, /\/auditoria\?/);
    assert.match(links.auditPresets.maderasParty, /resourceType=party/);
    assert.match(links.auditPresets.maderasParty, new RegExp(maderas.partyId));
    assert.match(links.auditPresets.cotizacion, /resourceType=quote/);
    assert.match(links.auditPresets.pedido, /resourceType=order/);
    assert.match(links.auditPresets.conversacion, /resourceType=conversation/);
    assert.ok(links.auditPresets.quoteById);
    assert.match(links.auditPresets.quoteById!, new RegExp(maderas.quoteId!));
    assert.ok(links.auditPresets.orderById);
    assert.match(links.auditPresets.orderById!, new RegExp(maderas.orderId!));

    // Same ids must appear across commercial + audit presets (one company, many desks).
    assert.ok(links.quote!.includes(maderas.quoteId!));
    assert.ok(links.auditPresets.quoteById!.includes(maderas.quoteId!));
    assert.ok(links.order!.includes(maderas.orderId!));
    assert.ok(links.auditPresets.orderById!.includes(maderas.orderId!));
  });

  it('documents expected Historial/Audit loop event types for MADERAS', () => {
    assert.ok(DEMO_MADERAS_EXPECTED_LOOP_EVENT_TYPES.includes('quote.created'));
    assert.ok(DEMO_MADERAS_EXPECTED_LOOP_EVENT_TYPES.includes('order.created'));
    assert.ok(DEMO_MADERAS_EXPECTED_LOOP_EVENT_TYPES.includes('conversation.recorded'));
  });

  it('maps owner-demo search intents to audit query filters', () => {
    const partyId = findDemoMaderasClient()!.partyId;
    assert.equal(
      auditQueryMatchesDemoIntent({ resourceType: 'party', resourceId: partyId }, 'maderas'),
      true,
    );
    assert.equal(auditQueryMatchesDemoIntent({ q: 'DEMO MADERAS' }, 'maderas'), true);
    assert.equal(auditQueryMatchesDemoIntent({ resourceType: 'quote' }, 'cotizacion'), true);
    assert.equal(auditQueryMatchesDemoIntent({ q: 'Cotización' }, 'cotizacion'), true);
    assert.equal(auditQueryMatchesDemoIntent({ resourceType: 'order' }, 'pedido'), true);
    assert.equal(auditQueryMatchesDemoIntent({ resourceType: 'conversation' }, 'conversacion'), true);
  });
});

describe('audit resource hrefs + presentation', () => {
  it('deep-links conversation / quote / order when party context is known', () => {
    const partyId = 'party-1';
    assert.equal(auditResourceHref('conversation', 'conv-1'), '/conversaciones?c=conv-1');
    assert.match(auditResourceHref('quote', 'q1', { partyId }) ?? '', /cotizaciones\/q1/);
    assert.match(auditResourceHref('order', 'o1', { partyId }) ?? '', /pedidos\/o1/);
    assert.equal(auditResourceHref('order', 'o1'), null);
  });

  it('reads partyId from audit snapshots for commercial deep links', () => {
    assert.equal(partyIdFromAuditSnapshot({ partyId: 'p-9' }), 'p-9');
    const href = auditResourceHrefForEntry({
      resourceType: 'quote',
      resourceId: 'q-9',
      afterJson: { partyId: 'p-9', quoteNumber: 'Q-1' },
    });
    assert.match(href ?? '', /clientes\/p-9\/cotizaciones\/q-9/);
  });

  it('re-humanizes conversation-origin actions on the web', () => {
    assert.equal(
      presentAuditActionLabel({
        action: 'opportunity.created_from_conversation',
        actionLabel: 'Opportunity Created From Conversation',
        resourceType: 'opportunity',
      }),
      'Oportunidad creada desde conversación',
    );
    assert.equal(
      presentAuditResourceLabel({ resourceType: 'conversation', resourceLabel: 'Conversation' }),
      'Conversación',
    );
  });

  it('exposes conversation resource type and demo-relevant actions in filters', () => {
    assert.ok(auditResourceTypeOptions().some((o) => o.value === 'conversation'));
    assert.ok(auditActionOptions().some((o) => o.value === 'conversation.recorded'));
    assert.ok(auditActionOptions().some((o) => o.value === 'quote.send_recorded'));
    assert.ok(auditActionOptions().some((o) => o.value === 'order.created'));
  });
});

describe('conversation provenance domain (PF-7)', () => {
  it('builds Origen / Ver conversación labels and extracts facts', () => {
    const view = conversationProvenanceView({
      conversationId: 'demo-conv-maderas',
      kind: 'follow_up',
      partyLabel: DEMO_MADERAS_DISPLAY_NAME,
    });
    assert.equal(view?.origenLabel, 'Origen: Conversación');
    assert.equal(view?.eventLabel, 'Seguimiento creado desde conversación');
    assert.equal(view?.verLabel, 'Ver conversación');
    assert.match(view?.href ?? '', /conversaciones\?c=demo-conv-maderas/);
    assert.equal(conversationIdFromFacts({ conversationId: 'c1' }), 'c1');
    assert.equal(provenanceKindFromEventType('issue.created_from_conversation'), 'issue');
  });
});
