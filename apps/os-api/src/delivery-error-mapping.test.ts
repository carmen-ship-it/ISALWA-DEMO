import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpStatus } from '@nestjs/common';
import { DeliveryQuantityExceedsOrderError } from '@isalwa/os-contracts';
import { toHttp } from './delivery.controller';

describe('delivery error mapping', () => {
  it('tells an over-delivery apart from a malformed payload', () => {
    const exceeded = new DeliveryQuantityExceedsOrderError('delivery_note', [
      { orderLineId: 'line-1', orderedQuantity: 10, alreadyCommitted: 8, requested: 5 },
    ]);
    const mapped = toHttp(exceeded);
    assert.equal(mapped.getStatus(), HttpStatus.BAD_REQUEST);
    const body = mapped.getResponse() as Record<string, unknown>;
    assert.equal(body.code, 'VALIDATION_FAILED');
    assert.equal(body.reason, 'DELIVERY_QUANTITY_EXCEEDS_ORDER');
    assert.equal(body.ledger, 'delivery_note');
    assert.equal((body.lines as unknown[]).length, 1);

    // A plain validation failure keeps its original shape.
    const plain = toHttp(new Error('VALIDATION_FAILED'));
    assert.equal(plain.getStatus(), HttpStatus.BAD_REQUEST);
    assert.deepEqual(plain.getResponse(), { code: 'VALIDATION_FAILED' });
  });
});
