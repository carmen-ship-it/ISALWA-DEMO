/**
 * Source + admission proofs for customer-conversations list (no HTTP session).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { recordManualCustomerConversation } from '@isalwa/os-contracts';

const here = dirname(fileURLToPath(import.meta.url));

describe('customer-conversations controller', () => {
  it('lists OsCustomerConversation via /customer-conversations, not legacy messaging', () => {
    const src = readFileSync(join(here, 'customer-conversations.controller.ts'), 'utf8');
    const mod = readFileSync(join(here, 'app.module.ts'), 'utf8');
    assert.match(src, /@Controller\('customer-conversations'\)/);
    assert.match(src, /osCustomerConversation\.findMany/);
    assert.match(src, /organizationId: session\.organizationId/);
    assert.match(src, /recordManualCustomerConversation/);
    assert.doesNotMatch(src, /Meta|Twilio|providerConnected:\s*true|send\(/);
    assert.match(mod, /CustomerConversationsController/);
  });

  it('re-admits persisted manual rows without inventing WhatsApp connectivity', () => {
    const admitted = recordManualCustomerConversation({
      id: 'conv-1',
      organizationId: 'org-1',
      customerId: 'party-1',
      customerLabel: 'DEMO MADERAS ORIENTE',
      contactLabel: 'Elena Rocha',
      channel: 'manual',
      occurredAt: '2026-09-16T15:00:00.000Z',
      enteredByMemberId: 'member-1',
      enteredByLabel: 'Owner demo seed',
      summary: 'Pedido completo ya recorrido — conversación de apertura del loop sano.',
      pastedEvidence: 'Buenos días.',
      opportunityId: 'opp-1',
      quoteId: 'quote-1',
      orderId: 'order-1',
      customerQuestion: '¿Pueden confirmarnos el estado del pedido?',
      commitmentCandidate: null,
      possibleRequestedDate: null,
      nextAction: null,
    });
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.providerConnected, false);
    assert.equal(admitted.record.channel, 'manual');
    assert.equal(admitted.record.provenance, 'company_entered');
  });
});
