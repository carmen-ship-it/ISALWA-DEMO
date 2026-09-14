import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COORDINATION_READ_AUTHORITY,
  CUSTOMER_INFORMED_FOUNDATION_GAP,
  LIVE_WRITER_MATRIX,
} from './writer-matrix';

describe('live writer classification', () => {
  it('implements only finished-goods receive and does not invent the other writers', () => {
    const implemented = LIVE_WRITER_MATRIX.filter((row) => row.state === 'IMPLEMENTED');
    assert.deepEqual(implemented.map((row) => row.domain), ['finished_goods_receive']);
    assert.equal(implemented[0]?.capability, 'warehouse.finished_goods.receive');
    assert.notEqual(implemented[0]?.capability, 'warehouse.finished_goods.allocate');
    for (const row of LIVE_WRITER_MATRIX) {
      if (row.domain === 'finished_goods_receive') continue;
      assert.notEqual(row.state, 'IMPLEMENTED');
      assert.ok(row.blocker === 'FOUNDATION_GAP' || row.blocker === 'CROSS_LANE_CHANGE_REQUEST');
    }
  });

  it('names the customer-informed gap and keeps coordination read closed', () => {
    assert.equal(CUSTOMER_INFORMED_FOUNDATION_GAP.kind, 'FOUNDATION_GAP');
    assert.match(CUSTOMER_INFORMED_FOUNDATION_GAP.missingFact, /ProductionDateIssue/);
    assert.equal(COORDINATION_READ_AUTHORITY.id, 'COORDINATION_READ_AUTHORITY');
    assert.equal(COORDINATION_READ_AUTHORITY.doNotUse.includes('coordination.decision.record'), true);
    assert.equal(JSON.stringify(COORDINATION_READ_AUTHORITY).includes('coordination.read'), false);
  });
});
