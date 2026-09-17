/**
 * Owner-demo durable conversation admission + seed plan (no DB).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { OWNER_DEMO_CLIENTS, OWNER_DEMO_CONVERSATIONS } from './catalog';
import { OWNER_DEMO_SYNTH_ORG } from './guards';
import {
  admitOwnerDemoConversation,
  buildOwnerDemoConversationInput,
  OWNER_DEMO_CONVERSATION_OCCURRED_AT,
  OWNER_DEMO_CONVERSATION_SEED_COUNT,
  ownerDemoConversationCreateData,
  ownerDemoConversationNaturalKey,
  planOwnerDemoConversationSeeds,
} from './conversations';

const here = dirname(fileURLToPath(import.meta.url));

describe('owner-demo durable conversations', () => {
  it('defines a natural key per DEMO client', () => {
    assert.equal(
      ownerDemoConversationNaturalKey('constructora_andina'),
      'owner-demo-conversation:constructora_andina',
    );
  });

  it('plans exactly five OsCustomerConversation rows for all required DEMO clients', () => {
    const plan = planOwnerDemoConversationSeeds();
    assert.equal(plan.length, OWNER_DEMO_CONVERSATION_SEED_COUNT);
    assert.equal(OWNER_DEMO_CLIENTS.length, OWNER_DEMO_CONVERSATION_SEED_COUNT);
    assert.equal(OWNER_DEMO_CONVERSATIONS.length, OWNER_DEMO_CONVERSATION_SEED_COUNT);

    const requiredNames = [
      'MADERAS ORIENTE',
      'CONSTRUCTORA ANDINA',
      'PROYECTOS DEL SUR',
      'HOTEL CENTRAL',
      'FERRETERÍA NORTE',
    ];
    for (const name of requiredNames) {
      assert.ok(
        plan.some((row) => row.displayName.includes(name)),
        `missing plan row for ${name}`,
      );
    }

    assert.deepEqual(
      plan.map((r) => r.clientKey),
      OWNER_DEMO_CLIENTS.map((c) => c.key),
    );
    assert.deepEqual(
      plan.map((r) => r.conversationId),
      OWNER_DEMO_CLIENTS.map((c) => ownerDemoConversationNaturalKey(c.key)),
    );
  });

  it('admits five manual company-entered rows with evidenced related ids only', () => {
    for (const client of OWNER_DEMO_CLIENTS) {
      const conversation = OWNER_DEMO_CONVERSATIONS.find((c) => c.clientKey === client.key);
      assert.ok(conversation, client.key);
      const links = {
        opportunityId: client.key === 'constructora_andina' ? 'opp-andina' : null,
        quoteId: client.key === 'proyectos_del_sur' ? 'quote-proyectos' : null,
        orderId: client.key === 'hotel_central' ? 'order-hotel' : null,
      };
      const admitted = admitOwnerDemoConversation({
        organizationId: OWNER_DEMO_SYNTH_ORG,
        client,
        conversation,
        partyId: `party-${client.key}`,
        enteredByMemberId: 'member-demo',
        links,
      });
      assert.equal(admitted.ok, true);
      if (!admitted.ok) continue;
      assert.equal(admitted.record.channel, 'manual');
      assert.equal(admitted.record.provenance, 'company_entered');
      assert.equal(admitted.record.source, 'employee_entered');
      assert.equal(admitted.record.providerConnected, false);
      assert.equal(admitted.record.advisorPhone, null);
      assert.equal(admitted.record.nextAction, null);
      assert.equal(admitted.record.occurredAt, OWNER_DEMO_CONVERSATION_OCCURRED_AT);
      assert.equal(admitted.record.opportunityId, links.opportunityId);
      assert.equal(admitted.record.quoteId, links.quoteId);
      assert.equal(admitted.record.orderId, links.orderId);

      const data = ownerDemoConversationCreateData(admitted.record, new Date().toISOString());
      assert.equal(data.channel, 'manual');
      assert.equal(data.provenance, 'company_entered');
      assert.equal(data.advisorNumberStatus, 'WHATSAPP_NUMBER_PENDING');
    }
  });

  it('keeps channel manual even when story mentions WhatsApp evidence', () => {
    const client = OWNER_DEMO_CLIENTS.find((c) => c.key === 'maderas_oriente')!;
    const conversation = OWNER_DEMO_CONVERSATIONS.find((c) => c.clientKey === 'maderas_oriente')!;
    const input = buildOwnerDemoConversationInput({
      organizationId: OWNER_DEMO_SYNTH_ORG,
      client,
      conversation,
      partyId: 'party-maderas',
      enteredByMemberId: 'member-demo',
      links: { opportunityId: 'o', quoteId: 'q', orderId: 'ord' },
    });
    assert.equal(input.channel, 'manual');
  });

  it('owner-demo seed upserts one conversation per client and fails if incomplete', () => {
    const seedSrc = readFileSync(join(here, 'seed.ts'), 'utf8');
    assert.match(seedSrc, /ensureOwnerDemoConversation/);
    assert.match(seedSrc, /planOwnerDemoConversationSeeds/);
    assert.match(seedSrc, /OWNER_DEMO_CONVERSATION_SEED_COUNT/);
    assert.match(seedSrc, /OWNER_DEMO_CONVERSATION_SEED_INCOMPLETE/);
    assert.match(seedSrc, /osCustomerConversation\.create/);
    assert.match(seedSrc, /conversationId/);
    assert.match(seedSrc, /OWNER_DEMO_CONVERSATIONS_SEEDED/);
  });
});
