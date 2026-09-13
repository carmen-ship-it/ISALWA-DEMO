import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLineTotalCentavos,
  computeQuoteTotals,
  parseCentavos,
} from './money';

describe('commercial money helpers', () => {
  it('computes deterministic line and quote totals in centavos', () => {
    const lineTotal = computeLineTotalCentavos(3, 12550n, 150n);
    assert.equal(lineTotal, 37500n);

    const totals = computeQuoteTotals(
      [{ lineTotalCentavos: 37500n }, { lineTotalCentavos: 10000n }],
      500n,
    );
    assert.equal(totals.subtotalCentavos, 47500n);
    assert.equal(totals.totalCentavos, 47000n);
  });

  it('rejects negative totals', () => {
    assert.throws(
      () => computeLineTotalCentavos(1, 100n, 200n),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
  });

  it('parses centavos from string and bigint', () => {
    assert.equal(parseCentavos('12345'), 12345n);
    assert.equal(parseCentavos(999), 999n);
    assert.equal(parseCentavos(888n), 888n);
  });
});
