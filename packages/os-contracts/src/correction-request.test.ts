import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CorrectionDecisionInputSchema,
  CorrectionRequestInputSchema,
  correctionEventMatches,
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
    assert.equal(correctionEventMatches(loc, event('location.updated', 'location', 'l1', { partyId: 'p1' })), true);
    assert.equal(correctionEventMatches(loc, event('location.updated', 'location', 'l2', { partyId: 'p1' })), false);
    assert.equal(correctionEventMatches(loc, event('location.updated', 'location', 'l1', { partyId: 'p2' })), false);

    const phone = target({ field: 'contact_phone', contactId: 'c1' });
    assert.equal(correctionEventMatches(phone, event('contact.endpoint.retired', 'contact', 'c1', { partyId: 'p1' })), true);
    assert.equal(correctionEventMatches(phone, event('contact.updated', 'contact', 'c1', { organizationPartyId: 'p1' })), false);

    const fiscal = target({ field: 'fiscal_identity' });
    assert.equal(correctionEventMatches(fiscal, event('party.fiscal_identity.changed', 'fiscal_identity', 'f1', { partyId: 'p1' })), true);
    assert.equal(correctionEventMatches(fiscal, event('party.updated', 'party', 'p1', { partyId: 'p1' })), false);

    assert.equal(correctionEventMatches(target({}), event('order.cancelled', 'order', 'o1', { partyId: 'p1' })), false);
  });
});
