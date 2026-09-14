import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_ORG_READ_SCOPE,
  CUSTOMER_COMMITTED_DATE_LABEL,
  CUSTOMER_DATE_SOURCE,
  DELIVERY_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  PRODUCTION_DATE_SOURCE,
  PRODUCTION_INTERNAL_TARGET_LABEL,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  buildCustomerCoverageGrant,
  finishedGoodsReceiptAllocatesToOrder,
  receiptAllocatesToOrder,
  releaseDecisionMayConfirmPayment,
  type CustomerCommittedDate,
  type OrderAllocation,
  type ProductionInternalTargetDate,
} from '@isalwa/os-contracts';
import { PEDIDO_FUNCTION_ROUTES } from '@/lib/navigation/requests/pedido';
import { COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE } from './pedido-access';
import {
  PEDIDO_LISTO_NOT_OWNERSHIP,
  PEDIDO_NO_ALLOCATION,
  PEDIDO_NO_CUSTOMER_DATE,
  PEDIDO_NO_PRODUCTION_DATE,
  PEDIDO_UNCLASSIFIED_LABEL,
  type PedidoOrderSnapshot,
} from './pedido-case';
import {
  PEDIDO_EXIT_IS_NOT_DELIVERY,
  PEDIDO_FACT_UNAVAILABLE,
  PEDIDO_PRODUCTION_NOT_CHILD,
  PEDIDO_SCOPES_UNCONFIRMED,
  PEDIDO_SECTION_DENIED,
  PEDIDO_SESSION_SCOPES_WIRE,
  answerValue,
  buildPedidoCaseFile,
  pedidoGrantedScopesFromSession,
  pedidoSection,
  timelineEntriesForPedido,
} from './pedido-case-file';

const asOf = new Date('2026-09-14T16:00:00.000Z');

const order: PedidoOrderSnapshot = {
  organizationId: 'org-a',
  orderId: 'order-1',
  orderNumber: 'PED-100',
  partyId: 'party-1',
  customerName: 'Cerámica Local',
  ownerMemberId: 'ana',
  ownerLabel: 'Ana',
  statusLabel: 'Registrado',
  createdAt: '2026-09-10T16:00:00.000Z',
  cancelledAt: null,
};

const customerDate: CustomerCommittedDate = {
  id: 'date-1',
  organizationId: 'org-a',
  subjectType: 'order',
  subjectId: 'order-1',
  partyId: 'party-1',
  commercialOwnerMemberId: 'ana',
  committedOn: '2026-10-01',
  originalCommittedOn: '2026-10-01',
  originalReason: 'Acordada con el cliente',
  source: CUSTOMER_DATE_SOURCE,
  setByMemberId: 'ana',
  setAt: '2026-09-12T16:00:00.000Z',
  canonical: true,
};

const productionDate: ProductionInternalTargetDate = {
  id: 'target-1',
  organizationId: 'org-a',
  subjectType: 'order',
  subjectId: 'order-1',
  maintainedByMemberId: 'prod-1',
  targetOn: '2026-09-20',
  originalTargetOn: '2026-09-20',
  originalReason: 'Calendario interno',
  source: PRODUCTION_DATE_SOURCE,
  setByMemberId: 'prod-1',
  setAt: '2026-09-13T16:00:00.000Z',
  canonical: true,
};

const allocation: OrderAllocation = {
  id: 'alloc-1',
  organizationId: 'org-a',
  finishedProductId: 'prod-jarra',
  productId: 'prod-jarra',
  goodsKind: 'finished',
  quantity: '2',
  orderLineId: 'line-1',
  allocatedAt: '2026-09-14T16:00:00.000Z',
  recordedAt: '2026-09-14T16:00:00.000Z',
  actorMemberId: 'alma',
  actorLabel: 'Almacén',
  source: 'explicit_command',
  finishedGoodsReceiptId: null,
  idempotencyKey: null,
  createdByReceipt: false,
  officialStock: false,
  wholeOrderFulfilled: false,
  isPartialDeliveryWorkflow: false,
};

function file(overrides: Parameters<typeof buildPedidoCaseFile>[0]['grantedScopes'] = null) {
  return buildPedidoCaseFile({
    order,
    actorMemberId: 'ana',
    grantedScopes: overrides,
    asOf,
  });
}

describe('pedido case file', () => {
  it('says unavailable instead of inventing an absence when facts were not loaded', () => {
    const view = file([COMMERCIAL_ORG_READ_SCOPE]);
    assert.equal(answerValue(view, 'cliente'), 'Cerámica Local');
    assert.equal(answerValue(view, 'pedido'), 'PED-100');
    assert.equal(answerValue(view, 'owner'), 'Ana');
    assert.equal(answerValue(view, 'cobertura'), PEDIDO_FACT_UNAVAILABLE);
    assert.equal(answerValue(view, 'clasificacion'), PEDIDO_FACT_UNAVAILABLE);
    assert.equal(answerValue(view, 'fecha-cliente'), PEDIDO_FACT_UNAVAILABLE);
    assert.equal(answerValue(view, 'fecha-produccion'), PEDIDO_FACT_UNAVAILABLE);
    assert.equal(answerValue(view, 'asignacion'), PEDIDO_SECTION_DENIED);
    assert.equal(answerValue(view, 'entrega'), PEDIDO_SECTION_DENIED);
    assert.equal(answerValue(view, 'informado'), PEDIDO_FACT_UNAVAILABLE);
    assert.equal(answerValue(view, 'fecha-cliente').includes('octubre'), false);
    assert.equal(answerValue(view, 'asignacion').includes(PEDIDO_NO_ALLOCATION), false);
    assert.equal(view.scopesWire.includes('loadMemberCapabilities'), true);
    assert.equal(view.scopesWire.includes('member-capabilities.ts'), true);
    assert.equal(PEDIDO_SESSION_SCOPES_WIRE, view.scopesWire);
    assert.equal(pedidoGrantedScopesFromSession(undefined), null);
    assert.equal(pedidoGrantedScopesFromSession(null), null);
  });

  it('keeps loaded dates separate and does not copy one into the other', () => {
    const view = buildPedidoCaseFile({
      order,
      actorMemberId: 'ana',
      grantedScopes: [COMMERCIAL_ORG_READ_SCOPE],
      asOf,
      customerDate: { status: 'loaded', value: customerDate },
      productionDate: { status: 'loaded', value: productionDate },
      classification: {
        status: 'loaded',
        value: {
          classification: 'special',
          requiresProductionPlanning: true,
          actorLabel: 'Ana',
          source: 'human_explicit',
          recordedAt: '2026-09-11T16:00:00.000Z',
        },
      },
    });
    assert.equal(answerValue(view, 'fecha-cliente').includes('1 de octubre'), true);
    assert.equal(answerValue(view, 'fecha-produccion').includes('20'), true);
    assert.notEqual(answerValue(view, 'fecha-cliente'), answerValue(view, 'fecha-produccion'));
    assert.equal(answerValue(view, 'fecha-produccion').includes('octubre'), false);
    assert.equal(answerValue(view, 'fecha-cliente').includes('20 de septiembre'), false);
    const fechas = pedidoSection(view, 'fechas');
    assert.equal(fechas.lines[0]?.startsWith(CUSTOMER_COMMITTED_DATE_LABEL), true);
    assert.equal(fechas.lines[1]?.startsWith(PRODUCTION_INTERNAL_TARGET_LABEL), true);
  });

  it('uses absence copy only after a query returned empty', () => {
    const view = buildPedidoCaseFile({
      order,
      actorMemberId: 'ana',
      grantedScopes: [COMMERCIAL_ORG_READ_SCOPE],
      asOf,
      customerDate: { status: 'empty' },
      productionDate: { status: 'empty' },
      classification: { status: 'empty' },
      allocations: { status: 'empty' },
    });
    assert.equal(answerValue(view, 'fecha-cliente'), PEDIDO_NO_CUSTOMER_DATE);
    assert.equal(answerValue(view, 'fecha-produccion'), PEDIDO_NO_PRODUCTION_DATE);
    assert.equal(answerValue(view, 'clasificacion'), PEDIDO_UNCLASSIFIED_LABEL);
    assert.equal(answerValue(view, 'asignacion'), PEDIDO_SECTION_DENIED);
    const warehouse = buildPedidoCaseFile({
      order,
      actorMemberId: 'alma',
      grantedScopes: [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE],
      asOf,
      allocations: { status: 'empty' },
    });
    assert.equal(answerValue(warehouse, 'asignacion'), PEDIDO_NO_ALLOCATION);
    assert.equal(answerValue(warehouse, 'fecha-produccion'), PEDIDO_SECTION_DENIED);
  });

  it('shows coverage without making the covering advisor a co-owner', () => {
    const grant = buildCustomerCoverageGrant({
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: 'ana',
      actingAdvisorMemberId: 'bruno',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    assert.ok(grant);
    const view = buildPedidoCaseFile({
      order,
      actorMemberId: 'bruno',
      grantedScopes: [],
      asOf,
      grants: { status: 'loaded', value: [grant] },
      actingAdvisorLabel: 'Bruno',
    });
    assert.equal(answerValue(view, 'owner'), 'Ana');
    assert.match(answerValue(view, 'cobertura'), /Bruno/);
    assert.match(answerValue(view, 'cobertura'), /no es responsable principal/i);
    assert.equal(view.coveringIsCoOwner, false);
    assert.equal(answerValue(view, 'cobertura').includes('Ana y Bruno'), false);
  });

  it('fails closed when session scopes are missing and does not treat cargo as a grant', () => {
    const view = buildPedidoCaseFile({
      order,
      actorMemberId: 'ana',
      grantedScopes: null,
      cargo: 'Jefe',
      title: 'Gerencia',
      asOf,
    });
    assert.equal(view.scopesConfirmed, false);
    assert.equal(view.exceptionVisible, false);
    for (const id of ['comercial', 'fechas', 'compras', 'produccion', 'almacen', 'entrega', 'evidencia'] as const) {
      const section = pedidoSection(view, id);
      assert.equal(section.gate, 'scopes_unconfirmed');
      assert.equal(section.links.length, 0);
      assert.equal(section.lines.join(' ').includes('PED-100'), false);
      assert.equal(section.lines.join(' ').includes('Bs'), false);
    }
    assert.equal(answerValue(view, 'cliente'), 'Cerámica Local');
    assert.equal(answerValue(view, 'fecha-cliente'), PEDIDO_SCOPES_UNCONFIRMED);
    assert.equal(answerValue(view, 'asignacion'), PEDIDO_SCOPES_UNCONFIRMED);
    assert.match(PEDIDO_SECTION_DENIED, /sin permiso/i);
  });

  it('opens only the section granted by an explicit scope', () => {
    const warehouse = buildPedidoCaseFile({
      order,
      actorMemberId: 'alma',
      grantedScopes: [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE],
      asOf,
    });
    assert.equal(pedidoSection(warehouse, 'almacen').gate, 'open');
    assert.equal(pedidoSection(warehouse, 'compras').gate, 'denied');
    assert.equal(pedidoSection(warehouse, 'produccion').gate, 'denied');
    assert.equal(pedidoSection(warehouse, 'entrega').gate, 'denied');
    assert.equal(pedidoSection(warehouse, 'comercial').gate, 'denied');
    assert.deepEqual(pedidoSection(warehouse, 'almacen').links, [
      { href: PEDIDO_FUNCTION_ROUTES.almacen, label: 'Almacén' },
    ]);

    const purchases = buildPedidoCaseFile({
      order,
      actorMemberId: 'compras',
      grantedScopes: [PURCHASING_OPERATIONAL_RECORD_SCOPE],
      asOf,
    });
    assert.equal(pedidoSection(purchases, 'compras').gate, 'open');
    assert.equal(pedidoSection(purchases, 'almacen').gate, 'denied');
    assert.match(pedidoSection(purchases, 'compras').lines.join(' '), /no están cargadas/i);

    const delivery = buildPedidoCaseFile({
      order,
      actorMemberId: 'entrega',
      grantedScopes: [DELIVERY_RECORD_SCOPE],
      asOf,
    });
    assert.equal(pedidoSection(delivery, 'entrega').gate, 'open');
    assert.match(pedidoSection(delivery, 'entrega').lines.join(' '), /no es la nota de entrega/i);

    const finance = buildPedidoCaseFile({
      order,
      actorMemberId: 'finanzas',
      grantedScopes: [FINANCE_OPERATIONAL_RECORD_SCOPE],
      asOf,
    });
    assert.equal(pedidoSection(finance, 'evidencia').gate, 'open');
    assert.equal(pedidoSection(finance, 'comercial').gate, 'denied');
    assert.equal(finance.exceptionVisible, false);

    const people = buildPedidoCaseFile({
      order,
      actorMemberId: 'admin',
      grantedScopes: ['people.admin'],
      asOf,
    });
    assert.equal(pedidoSection(people, 'comercial').gate, 'denied');
    assert.equal(pedidoSection(people, 'produccion').gate, 'denied');
  });

  it('does not treat payment as a gate or a release as a confirmed payment', () => {
    assert.equal(releaseDecisionMayConfirmPayment(), false);
    const view = buildPedidoCaseFile({
      order,
      actorMemberId: 'ana',
      grantedScopes: [COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE, COMMERCIAL_ORG_READ_SCOPE],
      cargo: 'Jefe',
      title: 'Gerencia',
      asOf,
    });
    assert.equal(view.paymentIsGate, false);
    assert.match(view.paymentNotRequired, /no confirma el pago/i);
    assert.equal(view.exceptionVisible, true);
    assert.match(view.exceptionNote, /commercial\.exception\.authorize/);
    const cargoOnly = buildPedidoCaseFile({
      order,
      actorMemberId: 'ana',
      grantedScopes: [COMMERCIAL_ORG_READ_SCOPE],
      cargo: 'Jefe',
      title: 'Gerencia',
      asOf,
    });
    assert.equal(cargoOnly.exceptionVisible, false);
    const copy = JSON.stringify(view);
    assert.equal(/\bpagado\b/i.test(copy), false);
    assert.equal(/\bcobrado\b/i.test(copy), false);
    assert.equal(/pago confirmado/i.test(copy), false);
  });

  it('does not treat listo as allocation or a warehouse exit as delivery', () => {
    assert.equal(finishedGoodsReceiptAllocatesToOrder(), false);
    assert.equal(receiptAllocatesToOrder(), false);
    const view = buildPedidoCaseFile({
      order,
      actorMemberId: 'alma',
      grantedScopes: [WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE, DELIVERY_RECORD_SCOPE],
      asOf,
      allocations: { status: 'empty' },
      receipts: { status: 'loaded', value: [{ productId: 'prod-jarra', recordedAt: '2026-09-14T16:00:00.000Z' }] },
      deliveries: { status: 'empty' },
      warehouseExits: { status: 'loaded', value: [{ exitedAt: '2026-09-14T16:00:00.000Z' }] },
    });
    assert.equal(view.listoAllocates, false);
    assert.equal(view.exitIsDelivery, false);
    assert.equal(answerValue(view, 'asignacion'), PEDIDO_NO_ALLOCATION);
    assert.match(pedidoSection(view, 'almacen').lines.join(' '), /listo no asigna|no asigna el producto/i);
    assert.match(answerValue(view, 'entrega'), /no es la nota de entrega/i);
    assert.equal(answerValue(view, 'entrega').includes('entregado'), false);
    assert.match(PEDIDO_EXIT_IS_NOT_DELIVERY, /no es la nota de entrega/i);
    assert.match(pedidoSection(view, 'almacen').lines.join(' '), new RegExp(PEDIDO_LISTO_NOT_OWNERSHIP));
  });

  it('shows allocation only as an explicit product join, not as production ownership', () => {
    const view = buildPedidoCaseFile({
      order,
      actorMemberId: 'prod',
      grantedScopes: [PRODUCTION_OPERATIONAL_RECORD_SCOPE, WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE],
      asOf,
      allocations: { status: 'loaded', value: [allocation] },
      lineLabels: { 'line-1': 'Jarra blanca' },
    });
    assert.equal(view.productionOwnedByOrder, false);
    assert.match(answerValue(view, 'asignacion'), /Jarra blanca/);
    assert.match(answerValue(view, 'asignacion'), /prod-jarra/);
    assert.equal(answerValue(view, 'asignacion').includes('SKU'), false);
    assert.match(pedidoSection(view, 'produccion').lines.join(' '), /no es hija de este pedido/i);
    assert.equal(pedidoSection(view, 'produccion').lines.join(' ').includes('orden de producción'), false);
    assert.match(PEDIDO_PRODUCTION_NOT_CHILD, /identificador de producto/i);
    assert.deepEqual(
      [pedidoSection(view, 'produccion').links[0]?.href, pedidoSection(view, 'almacen').links[0]?.href],
      [PEDIDO_FUNCTION_ROUTES.produccion, PEDIDO_FUNCTION_ROUTES.almacen],
    );
  });

  it('does not treat another order timeline entry as this pedido change', () => {
    const entries = timelineEntriesForPedido(
      [
        {
          entryId: 'e-1',
          organizationId: 'org-a',
          partyId: 'party-1',
          eventType: 'order.created',
          occurredAt: '2026-09-14T18:00:00.000Z',
          actorMemberId: 'ana',
          correlationId: 'corr-1',
          primaryEntityType: 'order',
          primaryEntityId: 'order-other',
          facts: { orderId: 'order-other', orderNumber: 'PED-200' },
        },
        {
          entryId: 'e-2',
          organizationId: 'org-a',
          partyId: 'party-1',
          eventType: 'order.created',
          occurredAt: '2026-09-11T18:00:00.000Z',
          actorMemberId: 'ana',
          correlationId: 'corr-2',
          primaryEntityType: 'order',
          primaryEntityId: 'order-1',
          facts: { orderId: 'order-1', orderNumber: 'PED-100' },
        },
      ],
      'org-a',
      'order-1',
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.label, 'Pedido creado');
    assert.equal(JSON.stringify(entries).includes('PED-200'), false);

    const management = buildPedidoCaseFile({
      order,
      actorMemberId: 'gerencia',
      grantedScopes: [MANAGEMENT_ORG_READ_SCOPE],
      asOf,
      history: { status: 'loaded', value: entries },
    });
    assert.match(answerValue(management, 'cambio'), /Pedido creado/);
    assert.equal(answerValue(management, 'cambio').includes('PED-200'), false);
    assert.equal(pedidoSection(management, 'historial').state, 'ready');
  });
});
