import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OPERATIONS_ACCESS_SCOPE_KEYS } from '../../os-contracts/src/operations-scopes';
import {
  COORDINATION_READ_AUTHORITY,
  CUSTOMER_INFORMED_FOUNDATION_GAP,
  LIVE_WRITER_MATRIX,
  WAREHOUSE_EXIT_WRITE_AUTHORITY,
} from './writer-matrix';

describe('live writer classification', () => {
  it('implements production, receive, allocation, delivery, coordination write, and payment evidence', () => {
    const implemented = LIVE_WRITER_MATRIX.filter((row) => row.state === 'IMPLEMENTED');
    assert.deepEqual(
      implemented.map((row) => row.domain),
      [
        'production_entry',
        'quema_start_end',
        'loss',
        'consumption',
        'finished_goods_receive',
        'allocation',
        'delivery',
        'coordination_decision',
        'payment_evidence',
      ],
    );

    for (const row of implemented) {
      assert.equal(row.blocker, null);
    }

    const purchase = LIVE_WRITER_MATRIX.find((row) => row.domain === 'purchase_request_transition');
    assert.equal(purchase?.blocker, 'BLOCKED_BY_GATE_C');
    assert.match(purchase?.detail ?? '', /20260916140000_os_purchase_status_workflow/);

    const exit = LIVE_WRITER_MATRIX.find((row) => row.domain === 'warehouse_exit');
    assert.equal(exit?.blocker, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(WAREHOUSE_EXIT_WRITE_AUTHORITY.liveWrite, 'AUTHORITY_BLOCKED');
    assert.equal(
      (OPERATIONS_ACCESS_SCOPE_KEYS as readonly string[]).includes('warehouse.outbound.record'),
      false,
    );

    const special = LIVE_WRITER_MATRIX.find((row) => row.domain === 'special_order_classification');
    assert.equal(special?.blocker, 'CROSS_LANE_CHANGE_REQUEST');

    for (const row of LIVE_WRITER_MATRIX) {
      if (row.state === 'IMPLEMENTED') continue;
      assert.ok(
        row.blocker === 'FOUNDATION_GAP' ||
          row.blocker === 'CROSS_LANE_CHANGE_REQUEST' ||
          row.blocker === 'BLOCKED_BY_GATE_C',
      );
    }
  });

  it('names the P1 customer-informed gap and keeps coordination read closed', () => {
    assert.equal(CUSTOMER_INFORMED_FOUNDATION_GAP.kind, 'FOUNDATION_GAP');
    assert.equal(CUSTOMER_INFORMED_FOUNDATION_GAP.id, 'CUSTOMER_INFORMED_OF_ORDER');
    assert.equal(CUSTOMER_INFORMED_FOUNDATION_GAP.priority, 'P1');
    assert.match(CUSTOMER_INFORMED_FOUNDATION_GAP.missingFact, /ProductionDateIssue/);
    assert.equal(COORDINATION_READ_AUTHORITY.id, 'COORDINATION_READ_AUTHORITY');
    assert.equal(COORDINATION_READ_AUTHORITY.kind, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(COORDINATION_READ_AUTHORITY.doNotUse.includes('coordination.decision.record'), true);
    assert.equal(JSON.stringify(COORDINATION_READ_AUTHORITY).includes('coordination.read'), false);
  });
});
