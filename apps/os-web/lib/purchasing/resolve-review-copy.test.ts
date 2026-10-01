import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PURCHASING_NO_PURCHASE_ORDER, purchasingResultCopy } from './resolve-review-copy';

describe('external Compras result', () => {
  it('records that no purchase order was created', () => {
    const recorded = purchasingResultCopy('Requiere gestión de compra externa');
    assert.match(recorded, /Requiere gestión de compra fuera de ISALWA/);
    assert.ok(recorded.includes(PURCHASING_NO_PURCHASE_ORDER));
  });
});
