import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CUSTOMER_COMMITTED_DATE_LABEL,
  CUSTOMER_DATE_SOURCE,
  PRODUCTION_DATE_SOURCE,
  PRODUCTION_INTERNAL_TARGET_LABEL,
  buildCustomerCoverageGrant,
  customerDateHasSeparateProductionTarget,
  finishedGoodsReceiptAllocatesToOrder,
  memberScopesCoverAllCustomers,
  receiptAllocatesToOrder,
  releaseDecisionMayConfirmPayment,
  type CustomerCommittedDate,
  type ProductionInternalTargetDate,
} from '@isalwa/os-contracts';
import { PEDIDO_FUNCTION_ROUTES } from '@/lib/navigation/requests/pedido';
import {
  PEDIDO_NO_ALLOCATION,
  PEDIDO_NO_CUSTOMER_DATE,
  PEDIDO_NO_PRODUCTION_DATE,
  PEDIDO_UNCLASSIFIED_LABEL,
  buildPedidoOperatingView,
  pedidoSectionFlags,
  type PedidoOrderSnapshot,
} from './pedido-case';
import { COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE } from './pedido-access';

const asOf = new Date('2026-09-14T12:00:00.000Z');

const order: PedidoOrderSnapshot = {
  organizationId: 'org-a',
  orderId: 'order-1',
  orderNumber: 'PED-100',
  partyId: 'party-1',
  customerName: 'Cerámica Local',
  ownerMemberId: 'ana',
  ownerLabel: 'Ana',
  statusLabel: 'Registrado',
  createdAt: '2026-09-10T12:00:00.000Z',
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
  setAt: '2026-09-12T12:00:00.000Z',
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
  setAt: '2026-09-13T12:00:00.000Z',
  canonical: true,
};

describe('pedido operating view', () => {
  it('keeps the customer date and the production date separate and off the order', () => {
    assert.equal(customerDateHasSeparateProductionTarget(), true);
    const onlyCustomer = buildPedidoOperatingView({
      order,
      actorMemberId: 'ana',
      asOf,
      customerDate,
      productionDate: null,
    });
    assert.equal(onlyCustomer.customerDate.label, CUSTOMER_COMMITTED_DATE_LABEL);
    assert.equal(onlyCustomer.productionDate.label, PRODUCTION_INTERNAL_TARGET_LABEL);
    assert.notEqual(onlyCustomer.customerDate.label, onlyCustomer.productionDate.label);
    assert.equal(onlyCustomer.customerDate.recorded, true);
    assert.equal(onlyCustomer.productionDate.recorded, false);
    assert.equal(onlyCustomer.productionDate.value, PEDIDO_NO_PRODUCTION_DATE);
    assert.equal(onlyCustomer.productionDate.value.includes('1 de octubre'), false);

    const onlyProduction = buildPedidoOperatingView({
      order,
      actorMemberId: 'ana',
      asOf,
      customerDate: null,
      productionDate,
    });
    assert.equal(onlyProduction.customerDate.value, PEDIDO_NO_CUSTOMER_DATE);
    assert.equal(onlyProduction.productionDate.recorded, true);
    assert.equal(onlyProduction.customerDate.value.includes('20'), false);

    const both = buildPedidoOperatingView({
      order,
      actorMemberId: 'ana',
      asOf,
      customerDate,
      productionDate,
    });
    assert.notEqual(both.customerDate.value, both.productionDate.value);
    assert.equal('committedOn' in both.order, false);
    assert.equal('targetOn' in both.order, false);
    assert.equal(JSON.stringify(both.order).includes('2026-10-01'), false);
    assert.equal(JSON.stringify(both.order).includes('2026-09-20'), false);
  });

  it('does not treat a release as a confirmed payment', () => {
    assert.equal(releaseDecisionMayConfirmPayment(), false);
    const view = buildPedidoOperatingView({
      order,
      actorMemberId: 'ana',
      asOf,
      releases: [
        {
          id: 'release-1',
          organizationId: 'org-a',
          orderId: 'order-1',
          state: 'released',
          basis: 'payment_verified',
          reason: 'Se revisó un comprobante',
          actorLabel: 'Ana',
          decidedAt: '2026-09-14T15:00:00.000Z',
          evidenceText: 'Comprobante visto',
        },
      ],
    });
    assert.equal(view.release?.confirmsPayment, false);
    assert.match(view.release?.boundary ?? '', /no confirma el pago/i);
    assert.match(view.paymentNotRequired, /no confirma el pago/i);
    const copy = JSON.stringify(view.release) + view.paymentNotRequired;
    assert.equal(/\bpagado\b/i.test(copy), false);
    assert.equal(/\bcobrado\b/i.test(copy), false);
    assert.equal(/pago confirmado/i.test(copy), false);
  });

  it('shows coverage without changing the owner or opening every customer', () => {
    assert.equal(memberScopesCoverAllCustomers([]), false);
    const grant = buildCustomerCoverageGrant({
      organizationId: 'org-a',
      customerPartyId: 'party-1',
      primaryOwnerMemberId: 'ana',
      actingAdvisorMemberId: 'bruno',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    assert.ok(grant);
    const view = buildPedidoOperatingView({
      order,
      actorMemberId: 'bruno',
      asOf,
      grants: [grant],
      actingAdvisorLabel: 'Bruno',
    });
    assert.equal(view.owner.primaryMemberId, 'ana');
    assert.equal(view.owner.primaryLabel, 'Ana');
    assert.equal(view.owner.actingAdvisorMemberId, 'bruno');
    assert.equal(view.owner.actingAdvisorLabel, 'Bruno');
    assert.equal(view.owner.sharedOwnership, false);
    assert.match(view.owner.note, /no comparte la propiedad/i);
  });

  it('does not classify a pedido as special from size, and does not invent allocation or ownership', () => {
    const view = buildPedidoOperatingView({
      order,
      actorMemberId: 'ana',
      asOf,
      classification: null,
      allocations: null,
      deliveries: [],
      receipt: { productLabel: 'Jarra', recordedAt: '2026-09-14T16:00:00.000Z' },
    });
    assert.equal(view.classificationLabel, PEDIDO_UNCLASSIFIED_LABEL);
    assert.equal(view.planningLabel, null);
    assert.equal(view.fulfillment.recorded, false);
    if (!view.fulfillment.recorded) {
      assert.equal(view.fulfillment.message, PEDIDO_NO_ALLOCATION);
    }
    assert.equal(receiptAllocatesToOrder(), false);
    assert.equal(finishedGoodsReceiptAllocatesToOrder(), false);
    assert.equal(view.listo?.ownsFinishedGoods, false);
    assert.match(view.listo?.message ?? '', /no hace dueño/i);
  });

  it('gates sections and does not infer exception authorization from cargo', () => {
    const hidden = pedidoSectionFlags({
      grantedScopes: ['people.admin'],
      isOwner: false,
      coverageAllowed: false,
      apiAuthorizedDocument: false,
      nextLane: null,
      cargo: 'Jefe',
      title: 'Gerencia',
    });
    assert.equal(hidden.summary, false);
    assert.equal(hidden.lines, false);
    assert.equal(hidden.operationalCase, false);
    assert.equal(hidden.exceptionAuthorize, false);
    assert.equal(hidden.productionLink, false);

    const exception = pedidoSectionFlags({
      grantedScopes: [COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE],
      isOwner: false,
      coverageAllowed: false,
      apiAuthorizedDocument: false,
      nextLane: null,
    });
    assert.equal(exception.exceptionAuthorize, true);
    assert.equal(exception.lines, false);

    assert.deepEqual(Object.values(PEDIDO_FUNCTION_ROUTES), [
      '/produccion',
      '/almacen',
      '/compras',
      '/entregas',
    ]);
  });
});
