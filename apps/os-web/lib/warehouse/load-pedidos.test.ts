import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapOrderDetailToWarehousePedidos } from './load-pedidos';

describe('mapOrderDetailToWarehousePedidos', () => {
  it('copies order line ids and quantities without inventing customer labels', () => {
    const pedidos = mapOrderDetailToWarehousePedidos({
      orderId: 'ord_1',
      organizationId: 'org_a',
      partyId: 'pty_1',
      commercialAccountId: null,
      quoteId: 'q_1',
      ownerMemberId: 'm_1',
      orderNumber: 'PED-9',
      status: 'open',
      currency: 'BOB',
      subtotalCentavos: '0',
      headerDiscountCentavos: '0',
      totalCentavos: '0',
      cancelledAt: null,
      createdAt: '2026-09-16T12:00:00.000Z',
      lines: [
        {
          orderLineId: 'ol_1',
          quoteId: 'q_1',
          quoteLineId: 'ql_1',
          lineNumber: 1,
          description: 'Lavamanos',
          quantity: 4,
          unitLabel: 'u',
          unitPriceCentavos: '100',
          discountCentavos: '0',
          lineTotalCentavos: '400',
          productRef: 'prod_lav',
        },
        {
          orderLineId: 'ol_2',
          quoteId: 'q_1',
          quoteLineId: 'ql_2',
          lineNumber: 2,
          description: 'Sin ref',
          quantity: 2,
          unitLabel: null,
          unitPriceCentavos: '50',
          discountCentavos: '0',
          lineTotalCentavos: '100',
          productRef: null,
        },
      ],
    });

    assert.equal(pedidos.length, 2);
    assert.equal(pedidos[0]?.orderId, 'ord_1');
    assert.equal(pedidos[0]?.orderLineId, 'ol_1');
    assert.equal(pedidos[0]?.productId, 'prod_lav');
    assert.equal(pedidos[0]?.productLabel, 'Lavamanos');
    assert.equal(pedidos[0]?.orderedQuantity, '4');
    assert.equal(pedidos[0]?.customerId, 'pty_1');
    assert.equal(pedidos[0]?.customerLabel, null);
    assert.equal(pedidos[0]?.orderLabel, 'PED-9');
    assert.equal(pedidos[1]?.productId, 'ol_2');
    assert.equal(pedidos[1]?.productLabel, 'Sin ref');
  });

  it('skips cancelled orders and orders without recorded lines', () => {
    assert.deepEqual(
      mapOrderDetailToWarehousePedidos({
        orderId: 'ord_x',
        organizationId: 'org_a',
        partyId: 'pty_1',
        commercialAccountId: null,
        quoteId: 'q_1',
        ownerMemberId: 'm_1',
        orderNumber: 'PED-X',
        status: 'cancelled',
        currency: 'BOB',
        subtotalCentavos: '0',
        headerDiscountCentavos: '0',
        totalCentavos: '0',
        cancelledAt: '2026-09-16T12:00:00.000Z',
        createdAt: '2026-09-16T12:00:00.000Z',
        lines: [
          {
            orderLineId: 'ol_x',
            quoteId: 'q_1',
            quoteLineId: 'ql_x',
            lineNumber: 1,
            description: 'X',
            quantity: 1,
            unitLabel: null,
            unitPriceCentavos: '0',
            discountCentavos: '0',
            lineTotalCentavos: '0',
            productRef: null,
          },
        ],
      }),
      [],
    );

    assert.deepEqual(
      mapOrderDetailToWarehousePedidos({
        orderId: 'ord_legacy',
        organizationId: 'org_a',
        partyId: 'pty_1',
        commercialAccountId: null,
        quoteId: 'q_1',
        ownerMemberId: 'm_1',
        orderNumber: 'PED-L',
        status: 'open',
        currency: 'BOB',
        subtotalCentavos: '100',
        headerDiscountCentavos: '0',
        totalCentavos: '100',
        cancelledAt: null,
        createdAt: '2026-09-16T12:00:00.000Z',
        lines: [],
      }),
      [],
    );
  });
});
