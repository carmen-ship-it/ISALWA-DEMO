import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CorrectionDecisionInputSchema,
  CorrectionRequestInputSchema,
  correctionEventMatches,
  correctionValueMatches,
  type CorrectionTarget,
} from './correction-request';

const AT = new Date('2026-10-01T12:00:00.000Z');
const target = (over: Partial<CorrectionTarget>): CorrectionTarget => ({
  partyId: 'p1',
  contactId: null,
  locationId: null,
  field: 'other',
  reportedAt: AT,
  ...over,
});
const event = (eventType: string, primaryEntityType: string, primaryEntityId: string, payload: Record<string, unknown>) => ({
  eventType,
  occurredAt: AT,
  primaryEntityType,
  primaryEntityId,
  payload,
});

describe('T03 L4 correction contract', () => {
  it('contact and location fields name their target; free text is bounded', () => {
    const base = { partyId: 'p1', proposedValue: 'x', source: 'staff' };
    assert.equal(CorrectionRequestInputSchema.safeParse({ ...base, field: 'contact_email' }).success, false);
    assert.equal(CorrectionRequestInputSchema.safeParse({ ...base, field: 'location_city' }).success, false);
    assert.equal(CorrectionRequestInputSchema.safeParse({ ...base, field: 'display_name' }).success, true);
    assert.equal(
      CorrectionRequestInputSchema.safeParse({ ...base, field: 'display_name', proposedValue: 'a'.repeat(501) }).success,
      false,
    );
  });

  it('applied needs an event id; rejected must not carry one', () => {
    assert.equal(CorrectionDecisionInputSchema.safeParse({ decision: 'applied', reason: 'Diez letras ok' }).success, false);
    assert.equal(
      CorrectionDecisionInputSchema.safeParse({ decision: 'rejected', appliedEventId: 'e', reason: 'Diez letras ok' }).success,
      false,
    );
    assert.equal(CorrectionDecisionInputSchema.safeParse({ decision: 'rejected', reason: 'Diez letras ok' }).success, true);
  });

  it('matches location, endpoint and fiscal events only on the requested customer and target', () => {
    const loc = target({ field: 'location_address', locationId: 'l1' });
    const addr = { partyId: 'p1', changedFields: 'addressText' };
    assert.equal(correctionEventMatches(loc, event('location.updated', 'location', 'l1', addr)), true);
    assert.equal(correctionEventMatches(loc, event('location.updated', 'location', 'l1', { partyId: 'p1', changedFields: 'label' })), false);
    assert.equal(correctionEventMatches(loc, event('location.updated', 'location', 'l2', addr)), false);
    assert.equal(correctionEventMatches(loc, event('location.updated', 'location', 'l1', { ...addr, partyId: 'p2' })), false);
    assert.equal(
      correctionEventMatches(target({ field: 'location_city', locationId: 'l1' }), event('location.updated', 'location', 'l1', addr)),
      false,
    );

    const phone = target({ field: 'contact_phone', contactId: 'c1' });
    const whatsapp = target({ field: 'contact_whatsapp', contactId: 'c1' });
    const phoneChange = event('contact.endpoint.retired', 'contact', 'c1', { partyId: 'p1', channel: 'phone' });
    assert.equal(correctionEventMatches(phone, phoneChange), true);
    assert.equal(correctionEventMatches(whatsapp, phoneChange), false);
    assert.equal(
      correctionEventMatches(whatsapp, event('contact.endpoint.changed', 'contact', 'c1', { partyId: 'p1', channel: 'phone', whatsappFollows: true })),
      true,
    );
    assert.equal(correctionEventMatches(phone, event('contact.updated', 'contact', 'c1', { organizationPartyId: 'p1', changedFields: 'givenName' })), false);

    const display = target({ field: 'display_name' });
    const legal = target({ field: 'legal_name' });
    const legalChange = event('party.updated', 'party', 'p1', { partyId: 'p1', changedFields: 'legalName' });
    assert.equal(correctionEventMatches(display, legalChange), false);
    assert.equal(correctionEventMatches(legal, legalChange), true);
    assert.equal(correctionEventMatches(display, event('party.updated', 'party', 'p1', { partyId: 'p1' })), false);

    const fiscal = target({ field: 'fiscal_identity' });
    assert.equal(correctionEventMatches(fiscal, event('party.fiscal_identity.changed', 'fiscal_identity', 'f1', { partyId: 'p1' })), true);
    assert.equal(correctionEventMatches(fiscal, event('party.updated', 'party', 'p1', { partyId: 'p1' })), false);

    assert.equal(correctionEventMatches(target({}), event('order.cancelled', 'order', 'o1', { partyId: 'p1' })), false);
  });

  it('compares the applied value with the proposal per field', () => {
    assert.equal(correctionValueMatches('contact_name', '  ana  maría PÉREZ ', 'Ana María Pérez'), true);
    assert.equal(correctionValueMatches('contact_name', 'Ana Maria Perez', 'Ana María Pérez'), false);
    assert.equal(correctionValueMatches('contact_phone', '700 20002', '+59170020002'), true);
    assert.equal(correctionValueMatches('contact_phone', '20002', '+59170020002'), false);
    assert.equal(correctionValueMatches('fiscal_identity', 'NIT 1234567-8', '12345678'), true);
    assert.equal(correctionValueMatches('other', 'x', 'x'), false);
    assert.equal(correctionValueMatches('display_name', 'Andina', null), false);
  });
});
