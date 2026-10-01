/**
 * Source + admission proofs for customer-conversations list (no HTTP session).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { recordManualCustomerConversation } from '@isalwa/os-contracts';
import { commercialLinkDenial, memberCanSeeConversation } from './customer-conversations.controller';

const here = dirname(fileURLToPath(import.meta.url));

describe('customer-conversations controller', () => {
  it('lists OsCustomerConversation via /customer-conversations, not legacy messaging', () => {
    const src = readFileSync(join(here, 'customer-conversations.controller.ts'), 'utf8');
    const mod = readFileSync(join(here, 'app.module.ts'), 'utf8');
    assert.match(src, /@Controller\('customer-conversations'\)/);
    assert.match(src, /osCustomerConversation\.findMany/);
    assert.match(src, /organizationId: session\.organizationId/);
    assert.match(src, /recordManualCustomerConversation/);
    assert.match(src, /@Post\(\)/);
    assert.match(src, /osCustomerConversation\.create/);
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

describe('conversation visibility and commercial links', () => {
  const stranger = {
    actorMemberId: 'mem-stranger',
    grantedScopes: [] as string[],
    enteredByMemberId: 'mem-owner',
    accountOwnerMemberId: 'mem-owner',
    directReportMemberIds: [] as string[],
  };

  it('hides another member conversation, including pasted evidence, from an unrelated member', () => {
    assert.equal(memberCanSeeConversation(stranger), false);
  });

  it('shows the conversation to its author, the account owner, their team lead, and an organization reader', () => {
    assert.equal(memberCanSeeConversation({ ...stranger, actorMemberId: 'mem-owner' }), true);
    assert.equal(
      memberCanSeeConversation({
        ...stranger,
        actorMemberId: 'mem-lead',
        grantedScopes: ['commercial.team.read'],
        directReportMemberIds: ['mem-owner'],
      }),
      true,
    );
    assert.equal(
      memberCanSeeConversation({ ...stranger, grantedScopes: ['commercial.org.read'] }),
      true,
    );
  });

  it('rejects a link the actor cannot read, a link for another customer, and a missing record the same way as a foreign one', () => {
    const base = {
      sessionOrganizationId: 'org-a',
      customerId: 'party-1',
      actorMemberId: 'mem-stranger',
      grantedScopes: [] as string[],
      directReportMemberIds: [] as string[],
    };
    assert.equal(
      commercialLinkDenial({
        ...base,
        record: { organizationId: 'org-b', partyId: 'party-1', ownerMemberId: 'mem-owner' },
      }),
      'not_found',
    );
    assert.equal(commercialLinkDenial({ ...base, record: null }), 'not_found');
    assert.equal(
      commercialLinkDenial({
        ...base,
        record: { organizationId: 'org-a', partyId: 'party-other', ownerMemberId: 'mem-stranger' },
      }),
      'wrong_customer',
    );
    assert.equal(
      commercialLinkDenial({
        ...base,
        record: { organizationId: 'org-a', partyId: 'party-1', ownerMemberId: 'mem-owner' },
      }),
      'not_allowed',
    );
  });
});
