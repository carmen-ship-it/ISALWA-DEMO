import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setDemoSeedIdMapForTests } from '@/lib/demo/owner-demo-registry';
import { demoFinishedGoodsOrderIds } from './demo-fg-citations';

describe('demoFinishedGoodsOrderIds', () => {
  it('returns empty outside demo mode', () => {
    setDemoSeedIdMapForTests({
      organizationId: 'org',
      REAL_SEVEN_MUTATED: 'NO',
      storyModePrimaryPartyId: null,
      clients: [
        {
          key: 'a',
          partyId: 'p',
          opportunityId: null,
          quoteId: null,
          quoteNumber: null,
          orderId: 'ord-1',
          deliveryNoteId: null,
          finishedGoodsReceiptId: 'fg-1',
          followUpWorkId: null,
          orderPrepWorkId: null,
          commitmentId: null,
        },
      ],
    });
    assert.equal(demoFinishedGoodsOrderIds('real').size, 0);
  });

  it('lists order ids with published FG receipt citations in demo', () => {
    setDemoSeedIdMapForTests({
      organizationId: 'org',
      REAL_SEVEN_MUTATED: 'NO',
      storyModePrimaryPartyId: null,
      clients: [
        {
          key: 'with-fg',
          partyId: 'p1',
          opportunityId: null,
          quoteId: null,
          quoteNumber: null,
          orderId: 'ord-fg',
          deliveryNoteId: null,
          finishedGoodsReceiptId: 'fg-1',
          followUpWorkId: null,
          orderPrepWorkId: null,
          commitmentId: null,
        },
        {
          key: 'no-fg',
          partyId: 'p2',
          opportunityId: null,
          quoteId: null,
          quoteNumber: null,
          orderId: 'ord-plain',
          deliveryNoteId: null,
          finishedGoodsReceiptId: null,
          followUpWorkId: null,
          orderPrepWorkId: null,
          commitmentId: null,
        },
      ],
    });
    const ids = demoFinishedGoodsOrderIds('demo');
    assert.equal(ids.has('ord-fg'), true);
    assert.equal(ids.has('ord-plain'), false);
    setDemoSeedIdMapForTests(null);
  });
});
