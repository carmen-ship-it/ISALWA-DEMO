import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertRecipientStillEligible,
  contactRecipientEligibility,
  pickCurrentContact,
  type RecipientContact,
} from './contact-recipient';
import { EndContactRelationshipPayloadSchema } from './party-commands';

const contact = (overrides: Partial<RecipientContact> = {}): RecipientContact => ({
  id: 'c1',
  version: 3,
  status: 'active',
  relationEndedAt: null,
  phone: '+59170000001',
  whatsapp: '+59170000002',
  phoneStatus: 'unverified',
  whatsappStatus: 'verified',
  ...overrides,
});

describe('T03 L1 recipient eligibility', () => {
  it('a current contact with a number in use is eligible, with a version that names contact, channel and number', () => {
    assert.deepEqual(contactRecipientEligibility(contact(), 'whatsapp'), {
      eligible: true,
      numberE164: '+59170000002',
      recipientVersion: 'c1:3:whatsapp:+59170000002',
    });
  });

  it('refuses ended relationships, inactive contacts, retired or missing numbers and numbers under review', () => {
    const cases: Array<[Partial<RecipientContact>, string]> = [
      [{ relationEndedAt: new Date('2026-10-01T04:00:00Z'), status: 'inactive' }, 'relation_ended'],
      [{ status: 'inactive' }, 'contact_inactive'],
      [{ whatsapp: null, whatsappRetiredAt: new Date('2026-10-01') }, 'endpoint_retired'],
      [{ whatsapp: null }, 'no_current_number'],
      [{ whatsappStatus: 'identity_review' }, 'identity_review'],
    ];
    for (const [overrides, reason] of cases) {
      assert.deepEqual(contactRecipientEligibility(contact(overrides), 'whatsapp'), { eligible: false, reason }, reason);
    }
  });

  it('a send planned before any change to the contact is refused at send time (T12 hook)', () => {
    const planned = contactRecipientEligibility(contact(), 'phone');
    assert.ok(planned.eligible);
    assert.deepEqual(assertRecipientStillEligible(planned.recipientVersion, contact(), 'phone'), planned);
    assert.deepEqual(assertRecipientStillEligible(planned.recipientVersion, contact({ version: 4 }), 'phone'), {
      eligible: false,
      reason: 'recipient_changed',
    });
    assert.deepEqual(
      assertRecipientStillEligible(planned.recipientVersion, contact({ version: 4, status: 'inactive', relationEndedAt: '2026-10-01' }), 'phone'),
      { eligible: false, reason: 'relation_ended' },
    );
  });

  it('the default document contact is the first current one, never a former contact', () => {
    const former = contact({ id: 'former', status: 'inactive', relationEndedAt: new Date('2026-10-01') });
    const inactive = contact({ id: 'inactive', status: 'inactive' });
    assert.equal(pickCurrentContact([former, inactive, contact({ id: 'current' })])?.id, 'current');
    assert.equal(pickCurrentContact([former, inactive]), null);
  });
});

describe('T03 L1 EndContactRelationship payload', () => {
  const base = { partyId: 'p1', contactId: 'c1', expectedVersion: 0, reason: 'left_company' };
  it('accepts a listed reason with an optional day', () => {
    assert.equal(EndContactRelationshipPayloadSchema.safeParse(base).success, true);
    assert.equal(EndContactRelationshipPayloadSchema.safeParse({ ...base, endedOn: '2026-10-01' }).success, true);
  });
  it('requires a note for "other" and refuses unknown reasons or malformed days', () => {
    assert.equal(EndContactRelationshipPayloadSchema.safeParse({ ...base, reason: 'other' }).success, false);
    assert.equal(EndContactRelationshipPayloadSchema.safeParse({ ...base, reason: 'other', reasonNote: 'Se jubiló este mes' }).success, true);
    assert.equal(EndContactRelationshipPayloadSchema.safeParse({ ...base, reason: 'moved' }).success, false);
    assert.equal(EndContactRelationshipPayloadSchema.safeParse({ ...base, endedOn: '01/10/2026' }).success, false);
  });
});
