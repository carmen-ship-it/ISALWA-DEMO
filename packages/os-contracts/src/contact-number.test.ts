import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ChangeContactEndpointPayloadSchema,
  CreatePartyPayloadSchema,
  maskContactNumber,
  normalizeContactNumber,
  UpdateContactPayloadSchema,
} from './party-commands';

describe('T03 C5 contact number contract', () => {
  it('normalizes Bolivian numbers entered with separators or the Bolivian prefix', () => {
    for (const number of ['71111456', '7111-1456', '711 11 456', '(711) 11456', '+591 71111456', '+59171111456', '00591 7111 1456']) {
      assert.equal(normalizeContactNumber({ country: 'BO', number }), '+59171111456', number);
    }
    assert.equal(normalizeContactNumber({ country: 'BO', number: '2 245 6789' }), '+59122456789');
  });

  it('never infers a country from digit count and refuses other calling codes', () => {
    for (const number of ['59171111456', '+54 11 2345 6789', '+1 202 555 0101', '7111145', '711114567', '51111456', 'abc', '7111 1456 ext 2']) {
      assert.equal(normalizeContactNumber({ country: 'BO', number }), null, number);
    }
    assert.equal(normalizeContactNumber({ country: 'AR', number: '1123456789' }), null);
    assert.equal(normalizeContactNumber({ country: '', number: '71111456' }), null);
  });

  it('every command path requires an explicit country object', () => {
    assert.equal(CreatePartyPayloadSchema.safeParse({ partyKind: 'organization', displayName: 'X', phone: '71111456' }).success, false);
    assert.equal(
      CreatePartyPayloadSchema.safeParse({ partyKind: 'organization', displayName: 'X', phone: { country: 'BO', number: '71111456' } }).success,
      true,
    );
    const contact = { organizationPartyId: 'p', givenName: 'A', familyName: 'B' };
    assert.equal(UpdateContactPayloadSchema.safeParse({ ...contact, whatsapp: '71111456' }).success, false);
    assert.equal(UpdateContactPayloadSchema.safeParse({ ...contact, whatsapp: { country: 'BO', number: '71111456' } }).success, true);
    const change = {
      partyId: 'p',
      contactId: 'c',
      expectedVersion: 0,
      reason: 'number_changed',
      verificationMethod: 'in_person',
      channel: 'whatsapp',
    };
    assert.equal(ChangeContactEndpointPayloadSchema.safeParse({ ...change, newNumber: '71111456' }).success, false);
    assert.equal(ChangeContactEndpointPayloadSchema.safeParse({ ...change, newNumber: { country: 'BO', number: '71111456' } }).success, true);
    assert.equal(ChangeContactEndpointPayloadSchema.safeParse({ ...change, channel: 'sms', newNumber: { country: 'BO', number: '71111456' } }).success, false);
  });

  it('masks to the last three digits', () => {
    assert.equal(maskContactNumber('+59171111456'), '•••456');
    assert.equal(maskContactNumber(null), null);
    assert.equal(maskContactNumber('12'), '•••');
  });
});
