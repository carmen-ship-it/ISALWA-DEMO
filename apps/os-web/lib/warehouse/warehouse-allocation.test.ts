import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { receiptAllocatesToOrder } from '@isalwa/os-contracts';
import {
  WAREHOUSE_EXIT_HREF,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_TASK_COPY,
} from '@isalwa/os-contracts';
import { WarehouseAllocationDesk, type WarehouseActorSession, type WarehouseFacts, type WarehousePedidoFact } from './desk';
import { resolveWarehousePageAccess } from './page-access';

const allocatedAt = '2026-09-14T16:00:00.000Z';
const laterAt = '2026-09-14T17:00:00.000Z';
const recordedAt = '2026-09-14T16:05:00.000Z';
const correctedAt = '2026-09-14T18:00:00.000Z';

const FOREIGN_CUSTOMER = 'Cliente Ajeno';
const FOREIGN_ORDER = 'Pedido Ajeno';
const FOREIGN_PRODUCT = 'Producto Ajeno';
const FOREIGN_QUANTITY = '91.25';
const FOREIGN_LINE = 'line-foreign';

function session(overrides: Partial<WarehouseActorSession> = {}): WarehouseActorSession {
  return {
    organizationId: 'org-a',
    memberId: 'member-a',
    actorLabel: 'Ana Ríos',
    accessStatus: 'active',
    grantedScopes: [WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE],
    cargo: 'Encargado de Almacén',
    title: 'Encargado',
    ...overrides,
  };
}

function facts(overrides: Partial<WarehouseFacts> = {}): WarehouseFacts {
  return {
    receipts: [
      {
        organizationId: 'org-a',
        productId: 'prod-finished-1',
        productLabel: 'Inodoro oval',
        quantity: '10',
        receiptId: 'receipt-a',
      },
    ],
    pedidos: [pedido()],
    ...overrides,
  };
}

function pedido(overrides: Partial<WarehousePedidoFact> = {}): WarehousePedidoFact {
  return {
    organizationId: 'org-a',
    orderId: 'order-a',
    orderLabel: 'Pedido 184',
    customerId: 'customer-a',
    customerLabel: 'Casa Rojas',
    orderLineId: 'line-1',
    productId: 'prod-finished-1',
    productLabel: 'Inodoro oval',
    orderedQuantity: '6',
    ...overrides,
  };
}

function foreignPedido(): WarehousePedidoFact {
  return pedido({
    organizationId: 'org-b',
    orderId: 'order-b',
    orderLabel: FOREIGN_ORDER,
    customerId: 'customer-b',
    customerLabel: FOREIGN_CUSTOMER,
    orderLineId: FOREIGN_LINE,
    productId: 'prod-foreign',
    productLabel: FOREIGN_PRODUCT,
    orderedQuantity: FOREIGN_QUANTITY,
  });
}

function allocateBody(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alloc-1',
    organizationId: 'org-a',
    productId: 'prod-finished-1',
    quantity: '2.5',
    orderLineId: 'line-1',
    orderLineOrganizationId: 'org-a',
    allocatedAt,
    recordedAt,
    actorMemberId: 'impostor',
    actorLabel: 'Impostor',
    source: 'explicit_command',
    finishedGoodsReceiptId: 'receipt-a',
    finishedGoodsReceiptOrganizationId: 'org-a',
    knownAvailableQuantity: '999',
    ...overrides,
  };
}

describe('a finished-goods receipt does not allocate', () => {
  it('observes a receipt without creating an allocation', () => {
    const desk = new WarehouseAllocationDesk();
    const observed = desk.observeFinishedGoodsReceipt({
      id: 'receipt-1',
      organizationId: 'org-a',
      productId: 'prod-finished-1',
      quantity: '8',
      warehouseLabel: 'Almacén de Productos Terminados',
    });
    assert.equal(observed.allocated, false);
    assert.equal(observed.allocation, null);
    assert.equal(observed.receiptCreated, false);
    assert.equal(receiptAllocatesToOrder(), false);
    assert.equal(desk.listAllocations(session()).length, 0);
    assert.equal(desk.getAllocation(session(), 'receipt-1'), null);
  });
});

describe('partial quantity and several allocations to one line', () => {
  it('stores a partial quantity and does not invent a fulfillment status', () => {
    const desk = new WarehouseAllocationDesk();
    const result = desk.allocate(session(), allocateBody({ quantity: '1' }), facts());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.allocation.quantity, '1');
    assert.equal(result.allocation.wholeOrderFulfilled, false);
    assert.equal(result.allocation.officialStock, false);
    assert.equal(Object.hasOwn(result.allocation, 'fulfillmentStatus'), false);
  });

  it('keeps two allocations on one line', () => {
    const desk = new WarehouseAllocationDesk();
    const first = desk.allocate(session(), allocateBody({ id: 'alloc-1', quantity: '1' }), facts());
    const second = desk.allocate(
      session(),
      allocateBody({ id: 'alloc-2', quantity: '1.5', allocatedAt: laterAt }),
      facts(),
    );
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    const rows = desk.listAllocations(session());
    assert.deepEqual(
      rows.map((row) => ({ id: row.id, orderLineId: row.orderLineId, quantity: row.quantity })),
      [
        { id: 'alloc-1', orderLineId: 'line-1', quantity: '1' },
        { id: 'alloc-2', orderLineId: 'line-1', quantity: '1.5' },
      ],
    );
    const remaining = desk.remainingAggregate(session(), facts());
    assert.equal(remaining.ok, true);
    if (!remaining.ok) return;
    assert.equal(remaining.byLine[0]?.allocatedQuantity, '2.5');
    assert.equal(remaining.byLine[0]?.remainingQuantity, '3.5');
    assert.equal(remaining.byLine[0]?.fulfillmentStatus, null);
  });
});

describe('OrderAllocation tenant and role gates', () => {
  it('allows a same-tenant allocation and keeps the session actor', () => {
    const desk = new WarehouseAllocationDesk();
    const result = desk.allocate(session(), allocateBody(), facts());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.allocation.organizationId, 'org-a');
    assert.equal(result.allocation.productId, 'prod-finished-1');
    assert.equal(result.allocation.orderLineId, 'line-1');
    assert.equal(result.allocation.quantity, '2.5');
    assert.equal(result.allocation.allocatedAt, allocatedAt);
    assert.equal(result.allocation.actorMemberId, 'member-a');
    assert.equal(result.allocation.actorLabel, 'Ana Ríos');
    assert.equal(result.allocation.source, 'explicit_command');
    assert.equal(result.allocation.createdByReceipt, false);
    assert.notEqual(result.allocation.actorLabel, 'Impostor');
  });

  it('denies a same-tenant member whose role is not assigned allocate', () => {
    const desk = new WarehouseAllocationDesk();
    const unauthorized = session({
      grantedScopes: ['warehouse.finished_goods.receive'],
      cargo: 'Encargado de Almacén',
      title: 'Encargado de Almacén',
    });
    const result = desk.allocate(unauthorized, allocateBody(), facts());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'unauthorized_role');
    assert.equal(desk.listAllocations(unauthorized).length, 0);
    assert.equal(desk.getAllocation(session(), 'alloc-1'), null);
  });

  it('denies a cross-tenant order line and a cross-tenant body organization', () => {
    const desk = new WarehouseAllocationDesk();
    const crossedLine = desk.allocate(
      session(),
      allocateBody({
        id: 'alloc-cross',
        orderLineId: FOREIGN_LINE,
        orderLineOrganizationId: 'org-b',
      }),
      facts({ pedidos: [pedido(), foreignPedido()] }),
    );
    assert.equal(crossedLine.ok, false);
    if (crossedLine.ok) return;
    assert.equal(crossedLine.reason, 'cross_tenant');
    assert.equal(desk.getAllocation(session(), 'alloc-cross'), null);

    const crossedBody = desk.allocate(
      session(),
      allocateBody({ id: 'alloc-body', organizationId: 'org-b' }),
      facts(),
    );
    assert.equal(crossedBody.ok, false);
    if (crossedBody.ok) return;
    assert.equal(crossedBody.reason, 'cross_tenant');
    assert.equal(desk.listAllocations(session()).length, 0);
  });

  it('does not reveal whether a foreign order line or allocation id exists', () => {
    const desk = new WarehouseAllocationDesk();
    const seeded = desk.allocate(
      session({ organizationId: 'org-b', memberId: 'member-b' }),
      allocateBody({
        id: 'alloc-foreign',
        organizationId: 'org-b',
        orderLineId: FOREIGN_LINE,
        orderLineOrganizationId: 'org-b',
        productId: 'prod-foreign',
        finishedGoodsReceiptId: 'receipt-b',
        finishedGoodsReceiptOrganizationId: 'org-b',
        knownAvailableQuantity: '10',
      }),
      facts({
        receipts: [
          {
            organizationId: 'org-b',
            productId: 'prod-foreign',
            productLabel: FOREIGN_PRODUCT,
            quantity: '10',
            receiptId: 'receipt-b',
          },
        ],
        pedidos: [foreignPedido()],
      }),
    );
    assert.equal(seeded.ok, true);
    const missingLine = desk.allocate(session(), allocateBody({ id: 'alloc-missing', orderLineId: 'line-absent' }), facts());
    const foreignLine = desk.allocate(session(), allocateBody({ id: 'alloc-probe', orderLineId: FOREIGN_LINE }), facts({ pedidos: [foreignPedido()] }));
    assert.equal(missingLine.ok, false);
    assert.equal(foreignLine.ok, false);
    if (missingLine.ok || foreignLine.ok) return;
    assert.equal(foreignLine.reason, missingLine.reason);
    assert.equal(foreignLine.reason, 'not_found');
    const missingCorrection = desk.correct(session(), {
      id: 'corr-missing',
      allocationId: 'alloc-absent',
      quantity: '1',
      reason: 'No está',
      correctedAt,
      recordedAt,
    });
    const foreignCorrection = desk.correct(session(), {
      id: 'corr-probe',
      allocationId: 'alloc-foreign',
      quantity: '1',
      reason: 'No está',
      correctedAt,
      recordedAt,
    });
    assert.equal(missingCorrection.ok, false);
    assert.equal(foreignCorrection.ok, false);
    if (missingCorrection.ok || foreignCorrection.ok) return;
    assert.equal(foreignCorrection.reason, missingCorrection.reason);
    assert.equal(foreignCorrection.reason, 'not_found');
    const reuseForeignId = desk.allocate(session(), allocateBody({ id: 'alloc-foreign' }), facts());
    assert.equal(reuseForeignId.ok, true);
  });

  it('denies a direct call that has no session organization', () => {
    const desk = new WarehouseAllocationDesk();
    const missing = desk.allocate(null, allocateBody({ organizationId: 'org-a' }), facts());
    assert.equal(missing.ok, false);
    if (missing.ok) return;
    assert.equal(missing.reason, 'no_session_org');

    const blank = desk.allocate(
      session({ organizationId: '   ' }),
      allocateBody({ organizationId: 'org-b' }),
      facts(),
    );
    assert.equal(blank.ok, false);
    if (blank.ok) return;
    assert.equal(blank.reason, 'no_session_org');
    assert.equal(desk.listAllocations(session()).length, 0);
    assert.equal(desk.getAllocation(session(), 'alloc-1'), null);
  });

  it('does not leak another tenant customer through pedido search or dropdown options', () => {
    const desk = new WarehouseAllocationDesk();
    const candidates = [pedido(), foreignPedido(), pedido({ customerLabel: null, orderLabel: null, productLabel: null })];
    const searched = desk.suggestPedidos(session(), FOREIGN_CUSTOMER, candidates);
    assert.equal(searched.ok, true);
    if (!searched.ok) return;
    assert.equal(searched.suggestions.length, 0);
    assert.equal(JSON.stringify(searched).includes(FOREIGN_CUSTOMER), false);
    assert.equal(JSON.stringify(searched).includes(FOREIGN_ORDER), false);
    assert.equal(JSON.stringify(searched).includes(FOREIGN_LINE), false);

    const open = desk.suggestPedidos(session(), '', candidates);
    assert.equal(open.ok, true);
    if (!open.ok) return;
    assert.equal(open.suggestions.some((item) => item.customerName.text === 'Casa Rojas'), true);
    assert.equal(open.suggestions.some((item) => item.optionLabel.includes(FOREIGN_CUSTOMER)), false);
    assert.equal(open.suggestions.every((item) => item.orderLineId !== FOREIGN_LINE), true);
    const unnamed = open.suggestions.find((item) => item.customerName.recorded === false);
    assert.equal(unnamed?.customerName.text, 'El nombre no fue registrado');
    assert.equal(unnamed?.optionLabel.includes('line-1'), false);

    const denied = desk.suggestPedidos(
      session({ grantedScopes: ['warehouse.finished_goods.receive'] }),
      '',
      candidates,
    );
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.reason, 'unauthorized_role');
    assert.equal(JSON.stringify(denied).includes(FOREIGN_CUSTOMER), false);
  });

  it('does not leak another tenant into the remaining-quantity aggregate', () => {
    const desk = new WarehouseAllocationDesk();
    desk.allocate(session(), allocateBody({ quantity: '1' }), facts());
    const aggregate = desk.remainingAggregate(session(), {
      receipts: [
        {
          organizationId: 'org-a',
          productId: 'prod-finished-1',
          productLabel: 'Inodoro oval',
          quantity: '10',
          receiptId: 'receipt-a',
        },
        {
          organizationId: 'org-b',
          productId: 'prod-finished-1',
          productLabel: FOREIGN_PRODUCT,
          quantity: FOREIGN_QUANTITY,
          receiptId: 'receipt-b',
        },
      ],
      pedidos: [pedido(), foreignPedido()],
    });
    assert.equal(aggregate.ok, true);
    if (!aggregate.ok) return;
    const encoded = JSON.stringify(aggregate);
    assert.equal(encoded.includes(FOREIGN_QUANTITY), false);
    assert.equal(encoded.includes(FOREIGN_CUSTOMER), false);
    assert.equal(encoded.includes(FOREIGN_ORDER), false);
    assert.equal(encoded.includes(FOREIGN_LINE), false);
    assert.equal(aggregate.byProduct[0]?.availableQuantity, '9');
    assert.equal(aggregate.byProduct[0]?.officialStock, false);
    assert.equal(aggregate.byLine.length, 1);
    assert.equal(aggregate.byLine[0]?.remainingQuantity, '5');
    assert.notEqual(aggregate.byLine[0]?.remainingQuantity, FOREIGN_QUANTITY);

    const denied = desk.remainingAggregate(
      session({ grantedScopes: [] }),
      facts({ pedidos: [pedido(), foreignPedido()] }),
    );
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.reason, 'unauthorized_role');
    assert.equal(JSON.stringify(denied).includes(FOREIGN_QUANTITY), false);
    assert.equal(JSON.stringify(denied).includes(FOREIGN_CUSTOMER), false);
  });
});

describe('availability stays unknown instead of becoming zero or another tenant', () => {
  it('does not turn unknown availability into zero', () => {
    const desk = new WarehouseAllocationDesk();
    const result = desk.allocate(session(), allocateBody(), facts({ receipts: null }));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'missing_availability');
    if (result.reason !== 'missing_availability') return;
    assert.equal(result.availableQuantity, null);
    assert.equal(result.officialStock, false);
    assert.equal(JSON.stringify(result).includes('"0"'), false);
    assert.equal(desk.listAllocations(session()).length, 0);

    const view = desk.view(session(), facts({ receipts: null }));
    assert.equal('waiting' in view, true);
    if (!('waiting' in view)) return;
    assert.equal(view.allocatable[0]?.availableQuantity, null);
    assert.equal(view.allocatable[0]?.availableText.includes('No es cero'), true);
    assert.equal(view.officialStock, false);
    assert.equal(JSON.stringify(view.allocatable).includes('"0"'), false);
  });

  it('does not treat another tenant receipts as this tenant availability', () => {
    const desk = new WarehouseAllocationDesk();
    const result = desk.allocate(
      session(),
      allocateBody({ quantity: '1' }),
      facts({
        receipts: [
          {
            organizationId: 'org-b',
            productId: 'prod-finished-1',
            productLabel: FOREIGN_PRODUCT,
            quantity: FOREIGN_QUANTITY,
            receiptId: 'receipt-b',
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
    if (result.ok || result.reason !== 'exceeds_available') return;
    assert.notEqual(result.availableQuantity, FOREIGN_QUANTITY);
    assert.equal(result.officialStock, false);
    assert.equal(desk.listAllocations(session()).length, 0);

    const aggregate = desk.remainingAggregate(session(), {
      receipts: [
        {
          organizationId: 'org-b',
          productId: 'prod-foreign',
          productLabel: FOREIGN_PRODUCT,
          quantity: FOREIGN_QUANTITY,
          receiptId: 'receipt-b',
        },
      ],
      pedidos: [foreignPedido()],
    });
    assert.equal(aggregate.ok, true);
    if (!aggregate.ok) return;
    assert.equal(aggregate.byProduct.length, 0);
    assert.equal(JSON.stringify(aggregate).includes(FOREIGN_QUANTITY), false);
  });
});

describe('a governed correction does not delete the original allocation', () => {
  it('appends actor, reason, and time and keeps the original row', () => {
    const desk = new WarehouseAllocationDesk();
    const saved = desk.allocate(session(), allocateBody({ quantity: '2' }), facts());
    assert.equal(saved.ok, true);
    const blocked = desk.correct(session({ organizationId: 'org-b' }), {
      id: 'corr-foreign',
      allocationId: 'alloc-1',
      organizationId: 'org-b',
      quantity: '2',
      reason: 'Borrar el original',
      correctedAt,
      recordedAt,
    });
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.equal(blocked.reason, 'not_found');
    assert.equal(desk.getAllocation(session(), 'alloc-1')?.quantity, '2');

    const corrected = desk.correct(session(), {
      id: 'corr-1',
      allocationId: 'alloc-1',
      quantity: '1',
      reason: 'Se anotó de más',
      correctedAt,
      recordedAt,
      actorMemberId: 'impostor',
      actorLabel: 'Impostor',
    });
    assert.equal(corrected.ok, true);
    if (!corrected.ok) return;
    assert.equal(corrected.correction.deletesAllocation, false);
    assert.equal(corrected.correction.actorMemberId, 'member-a');
    assert.equal(corrected.correction.actorLabel, 'Ana Ríos');
    assert.equal(corrected.correction.reason, 'Se anotó de más');
    assert.equal(corrected.correction.correctedAt, correctedAt);
    assert.equal(corrected.allocation.quantity, '2');
    assert.equal(desk.listAllocations(session()).length, 1);
    assert.equal(desk.getAllocation(session(), 'alloc-1')?.quantity, '2');
    assert.equal(desk.listCorrections(session()).length, 1);

    const view = desk.view(session(), facts());
    if (!('allocations' in view)) return;
    assert.equal(view.allocations[0]?.quantity, '2');
    assert.equal(view.allocations[0]?.originalPreserved, true);
    assert.equal(view.corrections[0]?.quantity, '1');
  });
});

describe('pedido suggestions stay inside the session tenant', () => {
  it('does not include another tenant customer even when the query matches', () => {
    const desk = new WarehouseAllocationDesk();
    const result = desk.suggestPedidos(session(), 'Pedido', [pedido(), foreignPedido()]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0]?.customerName.text, 'Casa Rojas');
    assert.equal(result.suggestions[0]?.optionLabel.includes(FOREIGN_CUSTOMER), false);
  });
});

describe('page access fails closed without a session organization or a confirmed scope', () => {
  it('denies a missing session and does not invent a ready desk from a body organization', () => {
    const access = resolveWarehousePageAccess({
      session: null,
      grantedScopes: [WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE],
      facts: facts({ pedidos: [foreignPedido()] }),
    });
    assert.equal(access.status, 'denied');
    if (access.status !== 'denied') return;
    assert.equal(access.reason, 'no_session_org');
    assert.equal(access.view, null);
    assert.equal(access.canAllocate, false);
  });

  it('denies an unconfirmed scope and unlocks receive without granting allocate', () => {
    const unconfirmed = resolveWarehousePageAccess({
      session: session({ grantedScopes: null }),
      grantedScopes: null,
      facts: facts({ pedidos: [pedido(), foreignPedido()] }),
    });
    assert.equal(unconfirmed.status, 'denied');
    if (unconfirmed.status === 'denied') assert.equal(unconfirmed.reason, 'permission_unconfirmed');

    const receiveOnly = resolveWarehousePageAccess({
      session: session({ grantedScopes: ['warehouse.finished_goods.receive'] }),
      grantedScopes: ['warehouse.finished_goods.receive'],
      facts: facts({ pedidos: [pedido(), foreignPedido()] }),
    });
    assert.equal(receiveOnly.status, 'ready');
    if (receiveOnly.status !== 'ready') return;
    assert.equal(receiveOnly.canReceive, true);
    assert.equal(receiveOnly.canAllocate, false);
    assert.equal(JSON.stringify(receiveOnly.view.pedidos).includes(FOREIGN_CUSTOMER), false);

    const unauthorized = resolveWarehousePageAccess({
      session: session({ grantedScopes: ['commercial.team.read'] }),
      grantedScopes: ['commercial.team.read'],
      facts: facts({ pedidos: [pedido(), foreignPedido()] }),
    });
    assert.equal(unauthorized.status, 'denied');
    if (unauthorized.status !== 'denied') return;
    assert.equal(unauthorized.reason, 'unauthorized_role');
    assert.equal(unauthorized.view, null);
    assert.equal(JSON.stringify(unauthorized).includes(FOREIGN_CUSTOMER), false);
  });
});

describe('warehouse surface copy', () => {
  it('answers the desk questions in Spanish and does not build a delivery note or a stock total', () => {
    const desk = readFileSync(join(__dirname, '../../components/warehouse/warehouse-desk.tsx'), 'utf8');
    const page = readFileSync(join(__dirname, '../../app/(app)/almacen/page.tsx'), 'utf8');
    const loading = readFileSync(join(__dirname, '../../app/(app)/almacen/loading.tsx'), 'utf8');
    const error = readFileSync(join(__dirname, '../../app/(app)/almacen/error.tsx'), 'utf8');
    assert.equal(WAREHOUSE_TASK_COPY.waiting, 'Qué está esperando');
    assert.equal(WAREHOUSE_TASK_COPY.allocatable, 'Qué puedo asignar');
    assert.equal(WAREHOUSE_TASK_COPY.pedido, 'A qué pedido');
    assert.equal(WAREHOUSE_TASK_COPY.quantity, 'Cuánto');
    assert.equal(WAREHOUSE_TASK_COPY.remains, 'Qué queda');
    assert.equal(WAREHOUSE_TASK_COPY.missingName, 'El nombre no fue registrado');
    assert.equal(WAREHOUSE_TASK_COPY.unknownAvailability.includes('No es cero'), true);
    assert.equal(WAREHOUSE_TASK_COPY.notOfficialStock, 'No es stock oficial.');
    assert.equal(WAREHOUSE_TASK_COPY.exitNote.includes('nota de entrega'), true);
    assert.equal(WAREHOUSE_EXIT_HREF, '/entregas');
    assert.equal(desk.includes('WAREHOUSE_TASK_COPY.waiting'), true);
    assert.equal(desk.includes('data-warehouse-status="denied"'), true);
    assert.equal(desk.includes("status === 'loading'"), true);
    assert.equal(desk.includes("status === 'error'"), true);
    assert.equal(desk.includes('WAREHOUSE_EXIT_HREF'), true);
    assert.equal(desk.includes('Nota de entrega'), false);
    assert.equal(desk.includes('stockTotal'), false);
    assert.equal(loading.includes('WAREHOUSE_TASK_COPY.loading'), true);
    assert.equal(error.includes('data-warehouse-status="error"'), true);
    assert.equal(page.includes('resolveWarehousePageAccess'), true);
    assert.equal(page.includes('loadWarehousePedidosFromOrders'), true);
    assert.equal(page.includes('WarehousePostSaleDesk'), true);
    assert.equal(page.includes('loadPostSalePedidos'), true);
    assert.equal(page.includes('pedidos: []'), false);
    assert.equal(page.includes('schema.prisma'), false);
  });
});
