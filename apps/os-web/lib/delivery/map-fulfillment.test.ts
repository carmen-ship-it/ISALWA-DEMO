import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mapFulfillmentDeliveriesToPanel,
  mapFulfillmentExitsToPanel,
  mapOrdersToLinkedFacts,
} from './map-fulfillment';

describe('mapFulfillment panel adapters', () => {
  it('maps delivery and exit rows with canonical ids and no invented note numbers', () => {
    const deliveries = mapFulfillmentDeliveriesToPanel([
      {
        id: 'del_1',
        orderId: 'ord_1',
        deliveredAt: '2026-09-16T15:00:00.000Z',
        deliveredTo: 'Recepcion',
        recordedByMemberId: 'm_1',
        source: 'explicit_command',
        notes: null,
        deliveryNote: {
          lines: [{ description: 'Lavamanos', quantity: 2, unitLabel: 'u' }],
        },
        evidence: [
          {
            role: 'delivery_confirmation',
            recordedByMemberId: 'm_1',
            reference: null,
            note: null,
            paymentState: null,
            recipient: 'Recepcion',
            signatureReference: null,
            confirmedLedgerPayment: false,
          },
        ],
      },
    ]);
    assert.equal(deliveries[0]?.recordedByLabel, 'm_1');
    assert.equal(deliveries[0]?.deliveredTo, 'Recepcion');
    const missing = mapFulfillmentDeliveriesToPanel([
      {
        id: 'del_2',
        orderId: 'ord_1',
        deliveredAt: '2026-09-16T15:00:00.000Z',
        deliveredTo: null,
        recordedByMemberId: 'm_1',
        source: 'explicit_command',
        notes: null,
        deliveryNote: { lines: [] },
        evidence: [],
      },
    ]);
    assert.equal(missing[0]?.deliveredTo, 'No registrado');
    assert.equal(deliveries[0]?.lines[0]?.description, 'Lavamanos');
    assert.equal(deliveries[0]?.evidence[0]?.confirmedLedgerPayment, false);

    const exits = mapFulfillmentExitsToPanel([
      {
        id: 'exit_1',
        orderId: 'ord_1',
        exitedAt: '2026-09-16T14:00:00.000Z',
        recordedByMemberId: 'm_2',
        source: 'warehouse_exit',
        notes: null,
        outboundNote: {
          lines: [{ description: 'Lavamanos', quantity: 2, unitLabel: 'u' }],
        },
      },
    ]);
    assert.equal(exits[0]?.id, 'exit_1');
    assert.equal(exits[0]?.lines.length, 1);
  });

  it('maps open orders for linking and drops cancelled', () => {
    const linked = mapOrdersToLinkedFacts([
      {
        orderId: 'ord_open',
        organizationId: 'org_a',
        partyId: 'pty_1',
        commercialAccountId: null,
        quoteId: 'q_1',
        ownerMemberId: 'm_1',
        orderNumber: 'PED-1',
        status: 'open',
        currency: 'BOB',
        subtotalCentavos: '0',
        headerDiscountCentavos: '0',
        totalCentavos: '0',
        cancelledAt: null,
        createdAt: '2026-09-16T12:00:00.000Z',
      },
      {
        orderId: 'ord_x',
        organizationId: 'org_a',
        partyId: 'pty_1',
        commercialAccountId: null,
        quoteId: 'q_2',
        ownerMemberId: 'm_1',
        orderNumber: 'PED-X',
        status: 'cancelled',
        currency: 'BOB',
        subtotalCentavos: '0',
        headerDiscountCentavos: '0',
        totalCentavos: '0',
        cancelledAt: '2026-09-16T13:00:00.000Z',
        createdAt: '2026-09-16T12:00:00.000Z',
      },
    ]);
    assert.deepEqual(linked, [
      {
        orderId: 'ord_open',
        orderNumber: 'PED-1',
        partyId: 'pty_1',
        status: 'open',
      },
    ]);
  });
});
