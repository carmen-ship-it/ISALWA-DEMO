/**
 * Pure rules for ADR 0003 cumulative dispatch (defined in @isalwa/os-contracts delivery.ts).
 * Kept here because os-delivery is the only consumer and owns the test surface.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DeliveryQuantityExceedsOrderError,
  assertCumulativeDispatchWithinOrder,
  computeDispatchBalance,
  findOverDispatchedLines,
  storeDeliveredQuantities,
  summarizeCommittedDispatch,
  type DispatchLedgerRows,
} from '@isalwa/os-contracts';

const ORDER = [
  { orderLineId: 'a', productRef: null, description: 'Plato', quantity: 10, unitLabel: null },
  { orderLineId: 'b', productRef: null, description: 'Taza', quantity: 4, unitLabel: null },
];

const rows = (overrides: Partial<DispatchLedgerRows> = {}): DispatchLedgerRows => ({
  notes: [],
  noteLines: [],
  exits: [],
  outboundLines: [],
  ...overrides,
});

describe('ADR 0003 summarizeCommittedDispatch', () => {
  it('counts issued notes and excludes reversed ones (reversal restores quantity)', () => {
    const committed = summarizeCommittedDispatch(
      rows({
        notes: [
          { id: 'n1', status: 'reversed' },
          { id: 'n1-reversal', status: 'reversed' },
          { id: 'n2', status: 'issued' },
        ],
        noteLines: [
          { noteId: 'n1', orderLineId: 'a', quantity: 6 },
          { noteId: 'n1-reversal', orderLineId: 'a', quantity: 6 },
          { noteId: 'n2', orderLineId: 'a', quantity: 3 },
        ],
      }),
    );
    assert.deepEqual(committed.deliveryNotes, { a: 3 });
  });

  it('keeps note and exit ledgers separate so a linked salida is not added to its nota', () => {
    const committed = summarizeCommittedDispatch(
      rows({
        notes: [{ id: 'n1', status: 'issued' }],
        noteLines: [{ noteId: 'n1', orderLineId: 'a', quantity: 10 }],
        exits: [{ id: 'x1', deliveryNoteId: 'n1' }],
        outboundLines: [{ warehouseExitId: 'x1', orderLineId: 'a', quantity: 10 }],
      }),
    );
    assert.deepEqual(committed, { deliveryNotes: { a: 10 }, warehouseExits: { a: 10 } });
  });

  it('excludes an exit linked to a reversed note and keeps an unlinked exit', () => {
    const committed = summarizeCommittedDispatch(
      rows({
        notes: [{ id: 'n1', status: 'reversed' }],
        exits: [
          { id: 'x-linked', deliveryNoteId: 'n1' },
          { id: 'x-free', deliveryNoteId: null },
        ],
        outboundLines: [
          { warehouseExitId: 'x-linked', orderLineId: 'a', quantity: 5 },
          { warehouseExitId: 'x-free', orderLineId: 'a', quantity: 2 },
        ],
      }),
    );
    assert.deepEqual(committed.warehouseExits, { a: 2 });
  });

  it('keeps counting an exit whose linked note is unknown (blocking is the safe direction)', () => {
    const committed = summarizeCommittedDispatch(
      rows({
        exits: [{ id: 'x1', deliveryNoteId: 'missing' }],
        outboundLines: [{ warehouseExitId: 'x1', orderLineId: 'a', quantity: 5 }],
      }),
    );
    assert.deepEqual(committed.warehouseExits, { a: 5 });
  });
});

describe('ADR 0003 assertCumulativeDispatchWithinOrder', () => {
  const requested = (orderLineId: string, quantity: number) =>
    storeDeliveredQuantities(ORDER, [{ orderLineId, quantity }]);

  it('accepts a request that fills the remaining quantity exactly', () => {
    assert.doesNotThrow(() =>
      assertCumulativeDispatchWithinOrder(
        ORDER,
        'delivery_note',
        { deliveryNotes: { a: 6 }, warehouseExits: {} },
        requested('a', 4),
      ),
    );
  });

  it('rejects a request that exceeds the remaining quantity and says which line', () => {
    assert.throws(
      () =>
        assertCumulativeDispatchWithinOrder(
          ORDER,
          'delivery_note',
          { deliveryNotes: { a: 6 }, warehouseExits: {} },
          requested('a', 5),
        ),
      (err: unknown) =>
        err instanceof DeliveryQuantityExceedsOrderError &&
        err.message === 'VALIDATION_FAILED' &&
        err.reason === 'DELIVERY_QUANTITY_EXCEEDS_ORDER' &&
        err.ledger === 'delivery_note' &&
        err.lines.length === 1 &&
        err.lines[0]?.orderLineId === 'a' &&
        err.lines[0]?.committed === 6,
    );
  });

  it('checks the ledger it is asked about, not the other one', () => {
    assert.doesNotThrow(() =>
      assertCumulativeDispatchWithinOrder(
        ORDER,
        'warehouse_exit',
        { deliveryNotes: { a: 10 }, warehouseExits: {} },
        requested('a', 10),
      ),
    );
  });
});

describe('ADR 0003 balance and over-delivery report', () => {
  it('computes remaining per ledger and clamps at zero', () => {
    const balance = computeDispatchBalance(ORDER, {
      deliveryNotes: { a: 3, b: 9 },
      warehouseExits: {},
    });
    assert.deepEqual(
      balance.map((line) => [line.orderLineId, line.remainingDeliveryNotes, line.remainingWarehouseExits]),
      [
        ['a', 7, 10],
        ['b', 0, 4],
      ],
    );
  });

  it('lists only lines past the order quantity', () => {
    const over = findOverDispatchedLines(ORDER, { deliveryNotes: { a: 10, b: 9 }, warehouseExits: { a: 11 } });
    assert.deepEqual(
      over.map((line) => [line.orderLineId, line.excessDeliveryNotes, line.excessWarehouseExits]),
      [
        ['a', 0, 1],
        ['b', 5, 0],
      ],
    );
  });

  it('is empty when nothing is over', () => {
    assert.deepEqual(findOverDispatchedLines(ORDER, { deliveryNotes: { a: 10 }, warehouseExits: { b: 4 } }), []);
  });

  it('does nothing for an order with no known lines', () => {
    assert.deepEqual(findOverDispatchedLines(null, { deliveryNotes: { a: 10 }, warehouseExits: {} }), []);
  });
});
