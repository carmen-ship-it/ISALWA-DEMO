import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DELIVERY_RECORD_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_OUTBOUND_RECORD_SCOPE,
} from '@isalwa/os-contracts';
import {
  canRecordDelivery,
  canRecordProduction,
  canRecordWarehouseOutbound,
} from '@isalwa/os-contracts';

function canReadOperationalOrders(scopes: readonly string[]): boolean {
  return (
    canRecordDelivery(scopes) ||
    canRecordWarehouseOutbound(scopes) ||
    canRecordProduction(scopes)
  );
}

describe('delivery operational order read gate', () => {
  it('allows production operational record to read pedido context', () => {
    assert.equal(canReadOperationalOrders([PRODUCTION_OPERATIONAL_RECORD_SCOPE]), true);
  });

  it('keeps delivery and warehouse outbound readers', () => {
    assert.equal(canReadOperationalOrders([DELIVERY_RECORD_SCOPE]), true);
    assert.equal(canReadOperationalOrders([WAREHOUSE_OUTBOUND_RECORD_SCOPE]), true);
  });

  it('denies unrelated scopes', () => {
    assert.equal(canReadOperationalOrders(['commercial.team.read']), false);
  });
});
