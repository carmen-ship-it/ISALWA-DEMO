import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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

  it('exposes conversation resource type and commercial actions in filters', () => {
    assert.ok(auditResourceTypeOptions().some((o) => o.value === 'conversation'));
    assert.ok(auditActionOptions().some((o) => o.value === 'conversation.recorded'));
    assert.ok(auditActionOptions().some((o) => o.value === 'quote.send_recorded'));
    assert.ok(auditActionOptions().some((o) => o.value === 'order.created'));
  });
});

describe('conversation provenance domain (PF-7)', () => {
  it('builds Origen / Ver conversación labels and extracts facts', () => {
    const view = conversationProvenanceView({
      conversationId: 'conv-1',
      kind: 'follow_up',
      partyLabel: 'Cliente de prueba',
    });
    assert.equal(view?.origenLabel, 'Origen: Conversación');
    assert.equal(view?.eventLabel, 'Seguimiento creado desde conversación');
    assert.equal(view?.verLabel, 'Ver conversación');
    assert.match(view?.href ?? '', /conversaciones\?c=conv-1/);
    assert.equal(conversationIdFromFacts({ conversationId: 'c1' }), 'c1');
    assert.equal(provenanceKindFromEventType('issue.created_from_conversation'), 'issue');
  });
});
