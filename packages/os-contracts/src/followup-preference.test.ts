import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOLLOWUP_KINDS,
  followupPermitted,
  SetContactFollowupPreferencePayloadSchema,
  type FollowupPreference,
} from './party-commands';

describe('T03 L2 followupPermitted', () => {
  it('promotions are off for everyone; requested replies and transactional messages are never blocked', () => {
    for (const preference of [null, 'allowed', 'no_promotions', 'no_unsolicited_followups'] as const) {
      assert.equal(followupPermitted(preference, 'promotional'), false, String(preference));
      assert.equal(followupPermitted(preference, 'requested_reply'), true, String(preference));
      assert.equal(followupPermitted(preference, 'transactional'), true, String(preference));
    }
  });

  it('"no me escriban" stops optional follow-ups; "no más promociones" does not', () => {
    const optional = (p: FollowupPreference | null) => followupPermitted(p, 'optional_followup');
    assert.deepEqual(
      [optional(null), optional('allowed'), optional('no_promotions'), optional('no_unsolicited_followups')],
      [true, true, true, false],
    );
    assert.deepEqual([...FOLLOWUP_KINDS], ['promotional', 'optional_followup', 'requested_reply', 'transactional']);
  });
});

describe('T03 L2 SetContactFollowupPreference payload', () => {
  const base = {
    partyId: 'p1',
    contactId: 'c1',
    channel: 'whatsapp',
    preference: 'no_promotions',
    source: 'staff_recorded',
    identityConfirmed: false,
    expectedVersion: 0,
  };
  const ok = (overrides: Record<string, unknown>) => SetContactFollowupPreferencePayloadSchema.safeParse({ ...base, ...overrides }).success;

  it('a restriction is accepted from staff, or from a customer message once a person confirms the sender', () => {
    assert.equal(ok({}), true);
    assert.equal(ok({ preference: 'no_unsolicited_followups', source: 'customer_message', identityConfirmed: true }), true);
    assert.equal(ok({ source: 'customer_message', identityConfirmed: false }), false);
  });

  it('allowed needs a staff record, confirmed identity and a note; never a customer message', () => {
    const note = 'Pidió volver a recibir seguimiento por teléfono';
    assert.equal(ok({ preference: 'allowed', identityConfirmed: true, note }), true);
    assert.equal(ok({ preference: 'allowed', source: 'customer_message', identityConfirmed: true, note }), false);
    assert.equal(ok({ preference: 'allowed', identityConfirmed: false, note }), false);
    assert.equal(ok({ preference: 'allowed', identityConfirmed: true, note: 'sí' }), false);
    assert.equal(ok({ preference: 'allowed', identityConfirmed: true }), false);
  });

  it('refuses unknown channels, values and sources', () => {
    assert.equal(ok({ channel: 'sms' }), false);
    assert.equal(ok({ preference: 'opt_in' }), false);
    assert.equal(ok({ source: 'ai_detected' }), false);
  });
});
