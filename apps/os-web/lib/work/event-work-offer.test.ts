import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EVENT_WORK_OFFER_COPY,
  eventWorkOfferIsHonest,
  offerAfterDeliveryFollowUp,
  offerAfterProductionExpectedDate,
  offerAfterQuoteSent,
} from '@/lib/work/event-work-offer';

describe('event → work offer adapters', () => {
  it('offers quote follow-up only when submitted and party is known', () => {
    const denied = offerAfterQuoteSent({ quoteStatus: 'draft', partyId: 'pty-1' });
    assert.equal(denied.offered, false);

    const offer = offerAfterQuoteSent({
      quoteStatus: 'submitted',
      partyId: 'pty-1',
      quoteNumber: 'Q-9',
    });
    assert.equal(offer.offered, true);
    if (!offer.offered) return;
    assert.equal(offer.autoDueAt, null);
    assert.equal(offer.requiresUserDueDate, true);
    assert.equal(offer.createCommand, 'CreateWorkItem');
    assert.match(offer.suggestedTitle, /Q-9/);
    assert.equal(eventWorkOfferIsHonest(offer), true);
  });

  it('offers production work from expected date without copying the date into dueAt', () => {
    const missing = offerAfterProductionExpectedDate({ targetOn: null });
    assert.equal(missing.offered, false);

    const offer = offerAfterProductionExpectedDate({
      targetOn: '2026-09-20',
      orderLabel: 'Pedido 12',
      partyId: 'pty-1',
    });
    assert.equal(offer.offered, true);
    if (!offer.offered) return;
    assert.equal(offer.autoDueAt, null);
    assert.equal(offer.trigger, 'production_expected_date');
    assert.match(offer.suggestedTitle, /Pedido 12/);
  });

  it('offers delivery follow-up without inventing a lag SLA', () => {
    const empty = offerAfterDeliveryFollowUp({});
    assert.equal(empty.offered, false);

    const offer = offerAfterDeliveryFollowUp({
      deliveryId: 'del-1',
      deliveredAt: '2026-09-16T15:00:00.000Z',
      partyId: 'pty-1',
    });
    assert.equal(offer.offered, true);
    if (!offer.offered) return;
    assert.equal(offer.autoDueAt, null);
    assert.match(EVENT_WORK_OFFER_COPY.noAutoSla, /días/);
    assert.match(EVENT_WORK_OFFER_COPY.reminderInProduct, /Trabajo/);
  });
});
