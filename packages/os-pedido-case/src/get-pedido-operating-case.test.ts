import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PARKED_PEDIDO_PAGE_MERGED,
  PEDIDO_UNPROVEN_COPY,
  createPrismaPedidoIdentityStore,
  getPedidoOperatingCase,
  type PedidoIdentityStore,
  type PedidoOperatingCase,
  type PedidoSectionId,
  type PedidoTrustedContext,
} from './index';

const FOREIGN_NAME = 'Cliente Ajeno Secreto';
const FOREIGN_NUMBER = 'PED-FOREIGN-909';
const FOREIGN_OWNER = 'mem-foreign-owner';
const FOREIGN_TOTAL = '999999';
const PRODUCTION_RUN = 'run-from-order-id';

const UNINJECTED: PedidoSectionId[] = [
  'specialOrderClassification',
  'customerCommittedDate',
  'productionInternalTargetDate',
  'production',
  'risk',
  'customerInformed',
  'purchasing',
  'release',
  'finishedGoods',
  'allocation',
  'remainingFulfillment',
  'warehouseExit',
  'delivery',
  'nextAction',
  'latestImportantChange',
  'evidenceHistory',
];

function team(overrides: Partial<PedidoTrustedContext> = {}): PedidoTrustedContext {
  return {
    organizationId: 'org-a',
    actorMemberId: 'mem-1',
    grantedScopes: ['commercial.team.read'],
    ...overrides,
  };
}

function readyOrder(store?: Partial<PedidoIdentityStore>): PedidoIdentityStore {
  return {
    async findOrderInOrg(organizationId, orderId) {
      if (organizationId !== 'org-a' || orderId !== 'ord-1') return null;
      return {
        id: 'ord-1',
        organizationId: 'org-a',
        partyId: 'party-1',
        commercialAccountId: 'acct-1',
        ownerMemberId: 'mem-owner',
        orderNumber: 'PED-100',
        status: 'open',
        currency: 'BOB',
        createdAt: '2026-09-01T12:00:00.000Z',
        cancelledAt: null,
      };
    },
    async findPartyInOrg(organizationId, partyId) {
      if (organizationId !== 'org-a' || partyId !== 'party-1') return null;
      return {
        id: 'party-1',
        organizationId: 'org-a',
        displayName: 'Cerámica Altiplano',
        status: 'active',
      };
    },
    async findCommercialAccountInOrg(organizationId, partyId) {
      if (organizationId !== 'org-a' || partyId !== 'party-1') return null;
      return {
        id: 'acct-1',
        organizationId: 'org-a',
        partyId: 'party-1',
        ownerMemberId: 'mem-account-other',
        status: 'active',
      };
    },
    ...store,
  };
}

function assertReady(result: PedidoOperatingCase): asserts result is Extract<PedidoOperatingCase, { outcome: 'ready' }> {
  assert.equal(result.outcome, 'ready');
  if (result.outcome !== 'ready') throw new Error('not ready');
}

describe('getPedidoOperatingCase', () => {
  it('does not leak a foreign order id', async () => {
    const queries: string[] = [];
    const store: PedidoIdentityStore = {
      async findOrderInOrg(organizationId, orderId) {
        queries.push(`${organizationId}:${orderId}`);
        if (organizationId === 'org-b' && orderId === 'ord-foreign') {
          return {
            id: 'ord-foreign',
            organizationId: 'org-b',
            partyId: 'party-b',
            commercialAccountId: null,
            ownerMemberId: FOREIGN_OWNER,
            orderNumber: FOREIGN_NUMBER,
            status: 'open',
            currency: 'BOB',
            createdAt: '2026-01-01T00:00:00.000Z',
            cancelledAt: null,
          };
        }
        if (organizationId === 'org-a' && orderId === 'ord-foreign') {
          return {
            id: 'ord-foreign',
            organizationId: 'org-b',
            partyId: 'party-b',
            commercialAccountId: null,
            ownerMemberId: FOREIGN_OWNER,
            orderNumber: FOREIGN_NUMBER,
            status: 'cancelled',
            currency: 'BOB',
            createdAt: '2026-01-01T00:00:00.000Z',
            cancelledAt: null,
          };
        }
        return null;
      },
      async findPartyInOrg() {
        return {
          id: 'party-b',
          organizationId: 'org-b',
          displayName: FOREIGN_NAME,
          status: 'active',
        };
      },
      async findCommercialAccountInOrg() {
        return null;
      },
    };

    const result = await getPedidoOperatingCase(
      'ord-foreign',
      Object.assign(team({ cargo: 'Gerente' }), { clientOrganizationId: 'org-b' }),
      { identity: store },
    );

    assert.equal(result.outcome, 'missing');
    assert.equal(result.sections, null);
    assert.equal(result.leaked, false);
    assert.deepEqual(queries, ['org-a:ord-foreign']);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(FOREIGN_NAME), false);
    assert.equal(serialized.includes(FOREIGN_NUMBER), false);
    assert.equal(serialized.includes(FOREIGN_OWNER), false);
    assert.equal(serialized.includes(FOREIGN_TOTAL), false);
    assert.equal(serialized.includes('org-b'), false);
    assert.equal(serialized.includes('cancelled'), false);
  });

  it('leaves uninjected sections UNPROVEN with the Spanish copy', async () => {
    const result = await getPedidoOperatingCase('ord-1', team(), { identity: readyOrder() });
    assertReady(result);
    assert.equal(result.sections.customer.state, 'AVAILABLE');
    assert.equal(result.sections.customer.displayCopy, 'Cerámica Altiplano');
    assert.equal(result.sections.order.state, 'AVAILABLE');
    assert.equal(result.sections.order.displayCopy, 'PED-100');
    assert.equal(result.sections.primaryOwner.state, 'AVAILABLE');
    assert.equal(result.sections.status.state, 'AVAILABLE');
    assert.equal(result.sections.status.displayCopy, 'Abierto');
    assert.equal(result.sections.coveringAdvisor.state, 'NO_FACT');
    assert.equal(result.sections.coveringAdvisor.reason, 'no_stored_covering_actor');
    assert.notEqual(result.sections.coveringAdvisor.displayCopy, result.sections.primaryOwner.displayCopy);
    if (result.sections.coveringAdvisor.state === 'NO_FACT') {
      assert.equal(result.sections.coveringAdvisor.fact, null);
    }
    assert.equal(result.boundaries.coveringIsSharedOwner, false);
    assert.equal(JSON.stringify(result).includes('mem-account-other'), false);

    for (const id of UNINJECTED) {
      const section = result.sections[id];
      assert.equal(section.state, 'UNPROVEN', id);
      assert.equal(section.reason, 'reader_not_connected', id);
      assert.equal(section.displayCopy, PEDIDO_UNPROVEN_COPY, id);
      assert.equal(section.fact, null, id);
      assert.equal(JSON.stringify(section).includes('"0"'), false, id);
      assert.equal(JSON.stringify(section).includes(':0'), false, id);
    }
  });

  it('keeps an injected NO_FACT and does not treat a missing date as false', async () => {
    const result = await getPedidoOperatingCase('ord-1', team(), {
      identity: readyOrder(),
      readers: {
        customerCommittedDate: async () => ({ state: 'NO_FACT', reason: 'no_stored_date' }),
        productionInternalTargetDate: async () => ({
          state: 'AVAILABLE',
          fact: { date: null, recorded: false } as unknown as { date: string },
        }),
        customerInformed: async () => ({
          state: 'AVAILABLE',
          fact: { informed: false },
        }),
      },
    });
    assertReady(result);
    assert.equal(result.sections.customerCommittedDate.state, 'NO_FACT');
    assert.equal(result.sections.customerCommittedDate.reason, 'no_stored_date');
    assert.equal(result.sections.customerCommittedDate.fact, null);
    assert.equal(result.sections.customerCommittedDate.displayCopy, 'Sin fecha con el cliente');
    assert.equal(result.sections.productionInternalTargetDate.state, 'NO_FACT');
    assert.equal(result.sections.productionInternalTargetDate.reason, 'missing_date');
    assert.equal(JSON.stringify(result.sections.productionInternalTargetDate).includes('false'), false);
    assert.equal(result.sections.customerInformed.state, 'NO_FACT');
    assert.equal(JSON.stringify(result.sections.customerInformed).includes('false'), false);
  });

  it('passes an injected AVAILABLE fact through', async () => {
    const result = await getPedidoOperatingCase('ord-1', team(), {
      identity: readyOrder(),
      readers: {
        delivery: async () => ({
          state: 'AVAILABLE',
          displayCopy: 'Entregado el 2 de septiembre',
          fact: { deliveredOn: '2026-09-02', note: 'En planta' },
        }),
        specialOrderClassification: async () => ({
          state: 'AVAILABLE',
          fact: {
            classification: 'special',
            requiresProductionPlanning: false,
            source: 'human_explicit',
            numericThreshold: null,
          },
        }),
      },
    });
    assertReady(result);
    assert.equal(result.sections.delivery.state, 'AVAILABLE');
    if (result.sections.delivery.state === 'AVAILABLE') {
      assert.equal(result.sections.delivery.displayCopy, 'Entregado el 2 de septiembre');
      assert.deepEqual(result.sections.delivery.fact, {
        deliveredOn: '2026-09-02',
        note: 'En planta',
      });
    }
    assert.equal(result.sections.specialOrderClassification.state, 'AVAILABLE');
    if (result.sections.specialOrderClassification.state === 'AVAILABLE') {
      assert.equal(result.sections.specialOrderClassification.fact.classification, 'special');
      assert.equal(result.sections.specialOrderClassification.fact.numericThreshold, null);
      assert.equal(result.sections.specialOrderClassification.fact.requiresProductionPlanning, false);
    }
    assert.equal(result.boundaries.specialOrderUsesNumericThreshold, false);
  });

  it('does not let cargo replace commercial.team.read', async () => {
    const cargo = await getPedidoOperatingCase(
      'ord-1',
      team({ grantedScopes: [], cargo: 'Gerente comercial', title: 'Jefe de ventas' }),
      { identity: readyOrder() },
    );
    assert.equal(cargo.outcome, 'denied');
    if (cargo.outcome !== 'denied') return;
    assert.equal(cargo.reason, 'role_forbidden');
    assert.equal(cargo.sections, null);
    assert.equal(JSON.stringify(cargo).includes('Cerámica Altiplano'), false);
    assert.equal(JSON.stringify(cargo).includes('PED-100'), false);

    const cargoNamedAsScope = await getPedidoOperatingCase(
      'ord-1',
      team({ grantedScopes: ['people.admin'], cargo: 'commercial.team.read' }),
      { identity: readyOrder() },
    );
    assert.equal(cargoNamedAsScope.outcome, 'denied');
    if (cargoNamedAsScope.outcome !== 'denied') return;
    assert.equal(cargoNamedAsScope.reason, 'role_forbidden');
  });

  it('denies the wrong role and does not unlock people.admin', async () => {
    let queried = false;
    const store = readyOrder({
      async findOrderInOrg() {
        queried = true;
        return null;
      },
    });
    const admin = await getPedidoOperatingCase(
      'ord-1',
      team({ grantedScopes: ['people.admin'], cargo: 'Administración' }),
      { identity: store },
    );
    assert.equal(admin.outcome, 'denied');
    if (admin.outcome !== 'denied') return;
    assert.equal(admin.reason, 'role_forbidden');
    assert.equal(queried, false);
    assert.equal(JSON.stringify(admin).includes('Cerámica Altiplano'), false);

    const sibling = await getPedidoOperatingCase(
      'ord-1',
      team({ grantedScopes: ['commercial.org.read', 'commercial.team'] }),
      { identity: readyOrder() },
    );
    assert.equal(sibling.outcome, 'denied');

    const allowed = await getPedidoOperatingCase(
      'ord-1',
      team({ grantedScopes: ['management.org.read'], cargo: 'Dirección' }),
      { identity: readyOrder() },
    );
    assert.equal(allowed.outcome, 'ready');
  });

  it('does not attach production by order id', async () => {
    const calls: unknown[] = [];
    const store = readyOrder();
    const trap = Object.assign(store, {
      findProductionByOrderId(orderId: string) {
        calls.push(orderId);
        return { id: PRODUCTION_RUN, orderId };
      },
    });
    const result = await getPedidoOperatingCase('ord-1', team(), {
      identity: trap,
      readers: {
        production: async (input) => {
          calls.push(input);
          return {
            state: 'AVAILABLE',
            fact: {
              productId: 'prod-1',
              orderId: 'ord-1',
              productionRunId: PRODUCTION_RUN,
              orderOwnsProduction: true,
            } as unknown as { productId: string; orderOwnsProduction: false },
          };
        },
      },
    });
    assertReady(result);
    assert.equal(result.sections.production.state, 'UNPROVEN');
    assert.equal(result.sections.production.displayCopy, PEDIDO_UNPROVEN_COPY);
    assert.equal(result.boundaries.productionAttachedByOrderId, false);
    assert.deepEqual(calls, []);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(PRODUCTION_RUN), false);
    assert.equal(serialized.includes('productionRunId'), false);
    assert.equal(serialized.includes('orderOwnsProduction":true'), false);
  });

  it('passes a product-linked production fact and still does not own it from the order', async () => {
    const seen: unknown[] = [];
    const result = await getPedidoOperatingCase('ord-1', team(), {
      identity: readyOrder(),
      productIds: ['prod-9'],
      readers: {
        production: async (input) => {
          seen.push(input);
          assert.equal('orderId' in input, false);
          return {
            state: 'AVAILABLE',
            displayCopy: 'Registro de producto',
            fact: { productId: 'prod-9', label: 'Esmalte', orderOwnsProduction: false },
          };
        },
      },
    });
    assertReady(result);
    assert.equal(result.sections.production.state, 'AVAILABLE');
    if (result.sections.production.state === 'AVAILABLE') {
      assert.equal(result.sections.production.fact.productId, 'prod-9');
      assert.equal(result.sections.production.fact.orderOwnsProduction, false);
    }
    assert.deepEqual(seen, [{ organizationId: 'org-a', productIds: ['prod-9'] }]);
    assert.equal(result.boundaries.productionAttachedByOrderId, false);
  });

  it('refuses a numeric threshold as a special-order classification', async () => {
    const result = await getPedidoOperatingCase('ord-1', team(), {
      identity: readyOrder(),
      readers: {
        specialOrderClassification: async () => ({
          state: 'AVAILABLE',
          fact: {
            classification: 'special',
            requiresProductionPlanning: true,
            source: 'human_explicit',
            numericThreshold: null,
            totalCentavos: 500000,
          } as {
            classification: 'special';
            requiresProductionPlanning: boolean;
            source: 'human_explicit';
            numericThreshold: null;
          },
        }),
      },
    });
    assertReady(result);
    assert.equal(result.sections.specialOrderClassification.state, 'ERROR');
    assert.equal(result.sections.specialOrderClassification.reason, 'numeric_threshold_refused');
    assert.equal(result.boundaries.specialOrderUsesNumericThreshold, false);
    assert.equal(JSON.stringify(result.sections.specialOrderClassification).includes('Pedido especial'), false);
  });

  it('records that the parked page was not merged', () => {
    assert.equal(PARKED_PEDIDO_PAGE_MERGED, false);
  });
});

describe('createPrismaPedidoIdentityStore', () => {
  it('scopes order, party, and account reads and has no production query', async () => {
    const calls: string[] = [];
    const db = {
      osOrder: {
        async findFirst(args: { where: { id: string; organizationId: string } }) {
          calls.push(`order:${args.where.organizationId}:${args.where.id}`);
          return {
            id: args.where.id,
            organizationId: args.where.organizationId,
            partyId: 'party-1',
            commercialAccountId: 'acct-1',
            ownerMemberId: 'mem-owner',
            orderNumber: 'PED-1',
            status: 'open',
            currency: 'BOB',
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
            cancelledAt: null,
          };
        },
      },
      osParty: {
        async findFirst(args: { where: { id: string; organizationId: string } }) {
          calls.push(`party:${args.where.organizationId}:${args.where.id}`);
          return {
            id: args.where.id,
            organizationId: args.where.organizationId,
            displayName: 'Cliente',
            status: 'active',
          };
        },
      },
      osCommercialAccount: {
        async findFirst(args: { where: { organizationId: string; id?: string; partyId?: string } }) {
          calls.push(`account:${args.where.organizationId}:${args.where.id ?? ''}:${args.where.partyId ?? ''}`);
          return {
            id: 'acct-1',
            organizationId: args.where.organizationId,
            partyId: 'party-1',
            ownerMemberId: 'mem-owner',
            status: 'active',
          };
        },
      },
    };
    const store = createPrismaPedidoIdentityStore(db);
    const order = await store.findOrderInOrg('org-a', 'ord-1');
    assert.equal(order?.organizationId, 'org-a');
    await store.findPartyInOrg('org-a', 'party-1');
    await store.findCommercialAccountInOrg('org-a', 'party-1', 'acct-1');
    assert.deepEqual(calls, [
      'order:org-a:ord-1',
      'party:org-a:party-1',
      'account:org-a:acct-1:party-1',
    ]);
    assert.equal('osProductionRun' in db, false);
    assert.equal('osProductionTrace' in db, false);
  });
});
