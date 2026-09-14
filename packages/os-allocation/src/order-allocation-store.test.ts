import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  ORDER_ALLOCATION_COLUMNS,
  ORDER_ALLOCATION_LABEL,
  allocationFulfillsWholeOrder,
  allocationIsOfficialStock,
  receiptAllocatesToOrder,
} from '../../os-contracts/src/order-allocation';
import { InMemoryOrderAllocationStore } from './store';

const allocatedAt = '2026-09-14T16:00:00.000Z';
const laterAt = '2026-09-14T17:00:00.000Z';
const recordedAt = '2026-09-14T16:05:00.000Z';

function store() {
  return new InMemoryOrderAllocationStore();
}

function command(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alloc-1',
    organizationId: 'org-a',
    productId: 'prod-finished-1',
    quantity: '2.5',
    orderLineId: 'line-1',
    orderLineOrganizationId: 'org-a',
    allocatedAt,
    recordedAt,
    actorMemberId: 'member-1',
    actorLabel: 'Almacén',
    source: 'explicit_command' as const,
    finishedGoodsReceiptId: null,
    knownAvailableQuantity: '10',
    ...overrides,
  };
}

describe('a finished-goods receipt does not allocate', () => {
  it('observes a receipt without creating an allocation or a receipt', () => {
    const allocations = store();
    const observed = allocations.observeFinishedGoodsReceipt({
      id: 'receipt-1',
      organizationId: 'org-a',
      productId: 'prod-finished-1',
      quantity: '8',
      warehouseLabel: 'Almacén de Productos Terminados',
      source: 'manual',
    });

    assert.equal(observed.allocated, false);
    assert.equal(observed.allocation, null);
    assert.equal(observed.receiptCreated, false);
    assert.equal(receiptAllocatesToOrder(), false);
    assert.equal(allocations.listForProduct('org-a', 'prod-finished-1').length, 0);
    assert.equal(allocations.get('org-a', 'receipt-1'), null);
  });

  it('does not treat a receipt source as an allocation command', () => {
    const allocations = store();
    assert.throws(() =>
      allocations.allocate(
        command({
          source: 'manual',
          finishedGoodsReceiptId: 'receipt-1',
        }),
      ),
    );
    assert.equal(allocations.listForProduct('org-a', 'prod-finished-1').length, 0);
  });
});

describe('allocation links product, quantity, and order line', () => {
  it('stores the finished product id, quantity, order line, time, actor, and source', () => {
    const allocations = store();
    const result = allocations.allocate(command());

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.allocation.finishedProductId, 'prod-finished-1');
    assert.equal(result.allocation.productId, 'prod-finished-1');
    assert.equal(result.allocation.goodsKind, 'finished');
    assert.equal(result.allocation.quantity, '2.5');
    assert.equal(result.allocation.orderLineId, 'line-1');
    assert.equal(result.allocation.allocatedAt, allocatedAt);
    assert.equal(result.allocation.actorMemberId, 'member-1');
    assert.equal(result.allocation.actorLabel, 'Almacén');
    assert.equal(result.allocation.source, 'explicit_command');
    assert.equal(result.allocation.createdByReceipt, false);
    assert.equal(result.allocation.officialStock, false);
    assert.equal(result.allocation.wholeOrderFulfilled, false);
    assert.equal(result.allocation.isPartialDeliveryWorkflow, false);
    assert.equal(allocationFulfillsWholeOrder(), false);
    assert.equal(Object.hasOwn(result.allocation, 'fulfillmentStatus'), false);
    assert.equal(Object.hasOwn(result.allocation, 'deliveryStatus'), false);

    const stored = allocations.get('org-a', 'alloc-1');
    assert.equal(stored?.productId, 'prod-finished-1');
    assert.equal(stored?.quantity, '2.5');
    assert.equal(stored?.orderLineId, 'line-1');
  });

  it('allows a partial quantity and does not mark the order fulfilled', () => {
    const allocations = store();
    const result = allocations.allocate(command({ quantity: '1', knownAvailableQuantity: '10' }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.allocation.quantity, '1');
    assert.equal(result.allocation.wholeOrderFulfilled, false);
    assert.equal(allocationFulfillsWholeOrder(), false);
  });
});

describe('one product id can be allocated to more than one order line', () => {
  it('keeps both allocations over time and does not replace the first', () => {
    const allocations = store();
    const first = allocations.allocate(
      command({ id: 'alloc-line-1', orderLineId: 'line-1', quantity: '1', allocatedAt }),
    );
    const second = allocations.allocate(
      command({
        id: 'alloc-line-2',
        orderLineId: 'line-2',
        quantity: '3',
        allocatedAt: laterAt,
      }),
    );

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    const rows = allocations.listForProduct('org-a', 'prod-finished-1');
    assert.deepEqual(
      rows.map((row) => ({ id: row.id, orderLineId: row.orderLineId, quantity: row.quantity, allocatedAt: row.allocatedAt })),
      [
        { id: 'alloc-line-1', orderLineId: 'line-1', quantity: '1', allocatedAt },
        { id: 'alloc-line-2', orderLineId: 'line-2', quantity: '3', allocatedAt: laterAt },
      ],
    );
    assert.equal(rows.every((row) => row.productId === 'prod-finished-1'), true);
    assert.equal(rows.every((row) => row.wholeOrderFulfilled === false), true);
  });

  it('lets several receipt citations satisfy one order line without a delivery status', () => {
    const allocations = store();
    allocations.allocate(
      command({
        id: 'alloc-r1',
        quantity: '1.5',
        finishedGoodsReceiptId: 'receipt-1',
        finishedGoodsReceiptOrganizationId: 'org-a',
        allocatedAt,
      }),
    );
    allocations.allocate(
      command({
        id: 'alloc-r2',
        quantity: '2',
        finishedGoodsReceiptId: 'receipt-2',
        finishedGoodsReceiptOrganizationId: 'org-a',
        allocatedAt: laterAt,
      }),
    );

    const towardLine = allocations.listForOrderLine('org-a', 'line-1');
    assert.equal(towardLine.length, 2);
    assert.deepEqual(
      towardLine.map((row) => row.finishedGoodsReceiptId),
      ['receipt-1', 'receipt-2'],
    );
    assert.equal(allocations.quantityAllocatedToOrderLine('org-a', 'line-1'), '3.5');
    assert.equal(towardLine.every((row) => row.wholeOrderFulfilled === false), true);
    assert.equal(towardLine.every((row) => row.isPartialDeliveryWorkflow === false), true);
    assert.equal(allocations.get('org-a', 'receipt-1'), null);
    assert.equal(allocations.get('org-a', 'receipt-2'), null);
  });
});

describe('allocation cannot cross tenant', () => {
  it('hides another tenant allocation and rejects a mismatched order line tenant', () => {
    const allocations = store();
    const saved = allocations.allocate(command());
    assert.equal(saved.ok, true);

    assert.equal(allocations.get('org-b', 'alloc-1'), null);
    assert.equal(allocations.listForProduct('org-b', 'prod-finished-1').length, 0);
    assert.equal(allocations.listForOrderLine('org-b', 'line-1').length, 0);

    const crossed = allocations.allocate(
      command({
        id: 'alloc-cross',
        organizationId: 'org-a',
        orderLineOrganizationId: 'org-b',
        orderLineId: 'line-other',
      }),
    );
    assert.equal(crossed.ok, false);
    if (crossed.ok) return;
    assert.equal(crossed.reason, 'cross_tenant');
    assert.equal(allocations.get('org-a', 'alloc-cross'), null);
    assert.equal(allocations.get('org-b', 'alloc-cross'), null);

    const citedReceipt = allocations.allocate(
      command({
        id: 'alloc-receipt-org',
        finishedGoodsReceiptId: 'receipt-other',
        finishedGoodsReceiptOrganizationId: 'org-b',
      }),
    );
    assert.equal(citedReceipt.ok, false);
    if (citedReceipt.ok) return;
    assert.equal(citedReceipt.reason, 'cross_tenant');
    assert.equal(allocations.get('org-a', 'alloc-receipt-org'), null);
  });

  it('does not count another tenant receipts or allocations as availability', () => {
    const allocations = store();
    allocations.allocate(command({ quantity: '4', knownAvailableQuantity: '10' }));

    const other = allocations.projectAvailability({
      organizationId: 'org-b',
      productId: 'prod-finished-1',
      receipts: [
        {
          organizationId: 'org-a',
          productId: 'prod-finished-1',
          quantity: '10',
          receiptId: 'receipt-foreign',
        },
      ],
    });
    assert.equal(other.receiptQuantity, '0');
    assert.equal(other.allocatedQuantity, '0');
    assert.equal(other.availableQuantity, '0');
    assert.notEqual(other.availableQuantity, '10');
    assert.equal(other.officialStock, false);
    assert.equal(other.isLedger, false);

    const crossed = allocations.allocate(
      command({
        id: 'alloc-b',
        organizationId: 'org-b',
        orderLineOrganizationId: 'org-b',
        quantity: '1',
        knownAvailableQuantity: '10',
        receipts: [
          {
            organizationId: 'org-a',
            productId: 'prod-finished-1',
            quantity: '10',
            receiptId: 'receipt-foreign',
          },
        ],
      }),
    );
    assert.equal(crossed.ok, false);
    if (crossed.ok) return;
    assert.equal(crossed.reason, 'exceeds_available');
    if (crossed.reason !== 'exceeds_available') return;
    assert.equal(crossed.availableQuantity, '0');
    assert.equal(allocations.get('org-b', 'alloc-b'), null);
  });
});

describe('availability is a told figure or a projection, never an invented stock total', () => {
  it('rejects when availability is unknown and does not invent a number', () => {
    const allocations = store();
    const result = allocations.allocate(
      command({
        knownAvailableQuantity: null,
        receipts: null,
      }),
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'missing_availability');
    if (result.reason !== 'missing_availability') return;
    assert.equal(result.availableQuantity, null);
    assert.equal(result.officialStock, false);
    assert.equal(Object.hasOwn(result, 'stockTotal'), false);
    assert.equal(Object.hasOwn(result, 'stockBalance'), false);
    assert.equal(JSON.stringify(result).includes('"0"'), false);
    assert.equal(allocations.listForProduct('org-a', 'prod-finished-1').length, 0);

    const omitted = allocations.allocate(
      command({
        id: 'alloc-omitted',
        knownAvailableQuantity: undefined,
      }),
    );
    assert.equal(omitted.ok, false);
    if (omitted.ok) return;
    assert.equal(omitted.reason, 'missing_availability');
    if (omitted.reason !== 'missing_availability') return;
    assert.equal(omitted.availableQuantity, null);
  });

  it('does not turn unknown receipts into zero or into a negative stock total', () => {
    const allocations = store();
    const saved = allocations.allocate(command({ quantity: '4', knownAvailableQuantity: '4' }));
    assert.equal(saved.ok, true);

    const unknown = allocations.projectAvailability({
      organizationId: 'org-a',
      productId: 'prod-finished-1',
      receipts: null,
    });
    assert.equal(unknown.known, false);
    assert.equal(unknown.receiptQuantity, null);
    assert.equal(unknown.availableQuantity, null);
    assert.equal(unknown.allocatedQuantity, '4');
    assert.equal(unknown.officialStock, false);
    assert.equal(unknown.isLedger, false);
    assert.equal(allocationIsOfficialStock(), false);
  });

  it('rejects a quantity above the figure it was told', () => {
    const allocations = store();
    const result = allocations.allocate(command({ quantity: '3', knownAvailableQuantity: '2' }));
    assert.equal(result.ok, false);
    if (result.ok || result.reason !== 'exceeds_available') return;
    assert.equal(result.requestedQuantity, '3');
    assert.equal(result.availableQuantity, '2');
    assert.equal(result.officialStock, false);
    assert.equal(allocations.listForProduct('org-a', 'prod-finished-1').length, 0);

    const within = allocations.allocate(command({ id: 'alloc-within', quantity: '2', knownAvailableQuantity: '2' }));
    assert.equal(within.ok, true);
  });

  it('projects same-tenant receipts minus allocations and still does not post stock', () => {
    const allocations = store();
    const receipts = [
      { organizationId: 'org-a', productId: 'prod-finished-1', quantity: '5', receiptId: 'receipt-1' },
      { organizationId: 'org-a', productId: 'prod-finished-1', quantity: '1.5', receiptId: 'receipt-2' },
      { organizationId: 'org-b', productId: 'prod-finished-1', quantity: '100', receiptId: 'receipt-other' },
    ];
    const before = allocations.projectAvailability({
      organizationId: 'org-a',
      productId: 'prod-finished-1',
      receipts,
    });
    assert.equal(before.receiptQuantity, '6.5');
    assert.equal(before.availableQuantity, '6.5');
    assert.equal(before.officialStock, false);

    const saved = allocations.allocate(
      command({ quantity: '2', receipts, knownAvailableQuantity: null }),
    );
    assert.equal(saved.ok, true);

    const after = allocations.projectAvailability({
      organizationId: 'org-a',
      productId: 'prod-finished-1',
      receipts,
    });
    assert.equal(after.allocatedQuantity, '2');
    assert.equal(after.availableQuantity, '4.5');
    assert.equal(after.officialStock, false);
    assert.equal(after.isLedger, false);

    const over = allocations.allocate(
      command({
        id: 'alloc-over',
        quantity: '5',
        receipts,
        knownAvailableQuantity: '100',
      }),
    );
    assert.equal(over.ok, false);
    if (over.ok || over.reason !== 'exceeds_available') return;
    assert.equal(over.availableQuantity, '4.5');
    assert.equal(allocations.get('org-a', 'alloc-over'), null);
  });
});

describe('persistence boundary', () => {
  it('keeps the migration free of a ledger, a fulfillment status, and a receipt table', () => {
    const sql = readFileSync(
      join(
        __dirname,
        '../../os-database/prisma/migrations/20260915170000_os_order_allocation/migration.sql',
      ),
      'utf8',
    );
    const fragment = readFileSync(
      join(__dirname, '../../os-database/prisma/fragments/order-allocation.prisma'),
      'utf8',
    );
    const contract = readFileSync(join(__dirname, '../../os-contracts/src/order-allocation.ts'), 'utf8');

    assert.match(sql, /CREATE TABLE os_order_allocations/);
    assert.match(sql, /source = 'explicit_command'/);
    assert.match(sql, /product_id/);
    assert.match(sql, /order_line_id/);
    assert.match(sql, /allocated_at/);
    assert.match(sql, /actor_label/);
    assert.equal(/stock_balance|os_inventory|fulfillment_status|delivery_status/i.test(sql), false);
    assert.equal(/ALTER TABLE os_production/i.test(sql), false);
    assert.equal(/CREATE TABLE os_finished_goods_receipts/i.test(sql), false);
    assert.equal(/REFERENCES os_order_lines/i.test(sql), false);
    assert.match(fragment, /model OsOrderAllocation/);
    assert.equal(/fulfillmentStatus|deliveryStatus|stockBalance/.test(fragment), false);
    assert.equal(contract.includes('buildFinishedGoodsReceipt'), false);
    assert.equal((ORDER_ALLOCATION_COLUMNS as readonly string[]).includes('product_id'), true);
    assert.equal((ORDER_ALLOCATION_COLUMNS as readonly string[]).includes('quantity'), true);
    assert.equal((ORDER_ALLOCATION_COLUMNS as readonly string[]).includes('order_line_id'), true);
    assert.equal((ORDER_ALLOCATION_COLUMNS as readonly string[]).includes('stock_balance'), false);

    const packageFiles = readdirSync(join(__dirname, '..'));
    assert.equal(packageFiles.some((name) => name.endsWith('.tsx')), false);
    assert.equal(ORDER_ALLOCATION_LABEL, 'Asignación a pedido');
  });
});
