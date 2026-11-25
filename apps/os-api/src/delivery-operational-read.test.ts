import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DELIVERY_RECORD_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  WAREHOUSE_OUTBOUND_RECORD_SCOPE,
  canReadOperationalOrders,
} from '@isalwa/os-contracts';

describe('delivery operational order read gate', () => {
  it('allows production operational record to read pedido context', () => {
    assert.equal(canReadOperationalOrders([PRODUCTION_OPERATIONAL_RECORD_SCOPE]), true);
  });

  it('allows purchasing operational record to read pedido context', () => {
    assert.equal(canReadOperationalOrders([PURCHASING_OPERATIONAL_RECORD_SCOPE]), true);
  });

  it('keeps delivery and warehouse outbound readers', () => {
    assert.equal(canReadOperationalOrders([DELIVERY_RECORD_SCOPE]), true);
    assert.equal(canReadOperationalOrders([WAREHOUSE_OUTBOUND_RECORD_SCOPE]), true);
  });

  it('lets finished-goods receive and allocate read pedido context', () => {
    assert.equal(canReadOperationalOrders([WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE]), true);
    assert.equal(canReadOperationalOrders([WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE]), true);
  });

  it('denies unrelated scopes', () => {
    assert.equal(canReadOperationalOrders(['commercial.team.read']), false);
    assert.equal(canReadOperationalOrders(['commercial.org.read']), false);
    assert.equal(canReadOperationalOrders(['people.admin']), false);
  });
});
