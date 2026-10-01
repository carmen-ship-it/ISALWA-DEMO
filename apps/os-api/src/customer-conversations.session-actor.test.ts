/**
 * S5: POST /customer-conversations must take the actor, tenant and record id from
 * the authenticated session / server, never from the request body.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { admitSessionConversation } from './customer-conversations.controller';

const here = dirname(fileURLToPath(import.meta.url));

const session = { organizationId: 'org-a', actorMemberId: 'mem-real' };
const trusted = {
  session,
  enteredByLabel: 'Ana Quispe',
  customerLabel: 'Cliente Uno',
  id: 'server-generated-id',
};

const legitimateBody = {
  customerId: 'party-1',
  customerLabel: 'Cliente Uno',
  channel: 'manual',
  occurredAt: '2026-09-16T15:00:00.000Z',
  summary: 'Pidió cotización de 40 tableros.',
};

describe('customer conversation actor comes from the session (S5)', () => {
  it('ignores client-supplied id, enteredByMemberId, enteredByLabel and organizationId', () => {
    const admitted = admitSessionConversation({
      ...trusted,
      body: {
        ...legitimateBody,
        id: 'client-chosen-id',
        organizationId: 'org-victim',
        enteredByMemberId: 'mem-victim',
        enteredByLabel: 'Gerente General (spoofed)',
      },
    });
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.id, 'server-generated-id');
    assert.equal(admitted.record.organizationId, 'org-a');
    assert.equal(admitted.record.enteredByMemberId, 'mem-real');
    assert.equal(admitted.record.enteredByLabel, 'Ana Quispe');
  });

  it('takes the customer label from the server, not the client', () => {
    const admitted = admitSessionConversation({
      ...trusted,
      body: { ...legitimateBody, customerLabel: 'Otro nombre inventado' },
    });
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.customerLabel, 'Cliente Uno');
  });

  it('still logs a normal conversation that carries no actor fields', () => {
    const admitted = admitSessionConversation({ ...trusted, body: legitimateBody });
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.customerId, 'party-1');
    assert.equal(admitted.record.summary, 'Pidió cotización de 40 tableros.');
    assert.equal(admitted.record.enteredByMemberId, 'mem-real');
    assert.equal(admitted.record.providerConnected, false);
  });

  it('still logs a conversation that echoes its own (matching) actor fields, as the web app does', () => {
    const admitted = admitSessionConversation({
      ...trusted,
      body: {
        ...legitimateBody,
        id: 'client-id',
        organizationId: 'org-a',
        enteredByMemberId: 'mem-real',
        enteredByLabel: 'Ana Quispe',
      },
    });
    assert.equal(admitted.ok, true);
  });

  it('refuses when the session has no actor member', () => {
    const admitted = admitSessionConversation({
      ...trusted,
      session: { organizationId: 'org-a', actorMemberId: '' },
      body: legitimateBody,
    });
    assert.deepEqual(admitted, { ok: false, reason: 'missing_entered_by' });
  });

  it('still refuses an invalid body (non-object, missing summary)', () => {
    assert.equal(admitSessionConversation({ ...trusted, body: null }).ok, false);
    assert.equal(admitSessionConversation({ ...trusted, body: [] }).ok, false);
    const noSummary = admitSessionConversation({
      ...trusted,
      body: { ...legitimateBody, summary: '' },
    });
    assert.deepEqual(noSummary, { ok: false, reason: 'missing_summary' });
  });

  it('controller no longer trusts body actor fields and verifies the customer in-tenant', () => {
    const src = readFileSync(join(here, 'customer-conversations.controller.ts'), 'utf8');
    assert.doesNotMatch(src, /draft\.enteredByMemberId/);
    assert.match(src, /enteredByMemberId: actorMemberId/);
    assert.match(src, /osParty\.findFirst/);
    assert.match(src, /organizationId: session\.organizationId/);
  });
});
