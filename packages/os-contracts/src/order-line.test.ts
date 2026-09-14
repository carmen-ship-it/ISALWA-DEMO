import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  ORDER_LINE_PROVENANCE,
  OrderLineSchema,
  orderLinesFromHeader,
} from './order-line';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../os-database/prisma/migrations/20260915110000_os_order_line/migration.sql',
  ),
  'utf8',
);
const fragment = readFileSync(
  resolve(__dirname, '../../os-database/prisma/fragments/order-line.prisma'),
  'utf8',
);
const commercialCopy = readFileSync(
  resolve(__dirname, '../../os-commercial/src/order-lines.ts'),
  'utf8',
);

describe('order line contract', () => {
  it('keeps provenance as a quote conversion snapshot', () => {
    assert.equal(ORDER_LINE_PROVENANCE, 'quote_conversion_snapshot');
    assert.match(commercialCopy, /quote_conversion_snapshot/);
    assert.match(migration, /quote_conversion_snapshot/);
    assert.match(fragment, /productRefSnapshot/);
    assert.doesNotMatch(fragment, /productId|OsProduct|product_master/i);
    assert.doesNotMatch(migration, /INSERT INTO/i);
    assert.doesNotMatch(migration, /os_orders"?"?\s+SET/i);
  });

  it('requires source links and snapshots, and refuses a live catalog price', () => {
    const parsed = OrderLineSchema.parse({
      id: 'ol-1',
      organizationId: 'org-a',
      orderId: 'order-1',
      quoteId: 'quote-1',
      quoteLineId: 'ql-1',
      lineNumber: 1,
      descriptionSnapshot: 'Lavamanos',
      quantity: 2,
      unitLabel: 'pza',
      unitPriceCentavosSnapshot: '150000',
      discountCentavos: '5000',
      lineTotalCentavos: '295000',
      productRefSnapshot: 'SKU-1',
      provenance: ORDER_LINE_PROVENANCE,
      copiedAt: '2026-09-14T15:00:00.000Z',
    });
    assert.equal(parsed.quoteLineId, 'ql-1');
    assert.equal(parsed.unitPriceCentavosSnapshot, '150000');
    assert.equal(parsed.lineTotalCentavos, '295000');
    assert.throws(() =>
      OrderLineSchema.parse({
        ...parsed,
        catalogUnitPriceCentavos: '999',
      }),
    );
  });

  it('does not invent lines from an order header', () => {
    assert.equal(
      orderLinesFromHeader({ totalCentavos: '295000', subtotalCentavos: '295000', currency: 'BOB' }),
      null,
    );
  });
});
