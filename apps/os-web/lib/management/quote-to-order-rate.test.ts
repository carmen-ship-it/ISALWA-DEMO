import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countConvertedQuotesInPeriod,
  countIssuedQuotesInPeriod,
  quoteToOrderRateDisplay,
} from '@/lib/management/quote-to-order-rate';
import { examplePreviewIsolatedFromLive } from '@/lib/management/example-preview';

describe('quote to order rate', () => {
  it('returns em dash when the issued denominator is zero', () => {
    assert.equal(quoteToOrderRateDisplay(0, 0), '—');
    assert.equal(quoteToOrderRateDisplay(2, 0), '—');
  });

  it('computes rounded percentage from converted and issued counts', () => {
    assert.equal(quoteToOrderRateDisplay(1, 4), '25%');
    assert.equal(quoteToOrderRateDisplay(3, 3), '100%');
  });

  it('counts issued and converted quotes only inside the period', () => {
    const from = new Date('2026-09-01T00:00:00.000Z');
    const to = new Date('2026-09-30T23:59:59.999Z');
    const quotes = [
      {
        quoteId: 'q1',
        submittedAt: '2026-09-10T12:00:00.000Z',
        cancelledAt: null,
      },
      {
        quoteId: 'q2',
        submittedAt: '2026-08-01T12:00:00.000Z',
        cancelledAt: null,
      },
    ];
    const orderQuoteIds = new Set(['q1']);
    assert.equal(countIssuedQuotesInPeriod(quotes, from, to), 1);
    assert.equal(countConvertedQuotesInPeriod(quotes, orderQuoteIds, from, to), 1);
  });
});

describe('example preview isolation', () => {
  it('keeps fictitious example out of live metric JSON', () => {
    assert.equal(examplePreviewIsolatedFromLive('{"count":0}'), true);
    assert.equal(examplePreviewIsolatedFromLive('{"label":"EJEMPLO"}'), false);
  });
});
