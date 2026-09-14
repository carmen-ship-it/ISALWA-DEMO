import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCustomerCoverageGrant, memberScopesCoverAllCustomers } from '@isalwa/os-contracts';
import {
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  aggregatePedidoResource,
  canAuthorizeCommercialException,
  cargoGrantsExceptionAuthorization,
  readPedidoResource,
  searchPedidoResource,
  type PedidoAccessStore,
  type PedidoResource,
  type PedidoSession,
} from './pedido-access';

const asOf = new Date('2026-09-14T12:00:00.000Z');

const FOREIGN = {
  customerName: 'Cerámica Valle',
  orderNumber: 'PED-8841',
  lineText: 'Azulejo esmaltado azul',
};
const OTHER_CUSTOMER = {
  customerName: 'Taller Norte',
  orderNumber: 'PED-200',
  lineText: 'Plato hondo',
};

const store: PedidoAccessStore = {
  orders: [
    {
      organizationId: 'org-a',
      orderId: 'order-local',
      orderNumber: 'PED-100',
      partyId: 'party-local',
      customerName: 'Cerámica Local',
      ownerMemberId: 'ana',
      ownerLabel: 'Ana',
    },
    {
      organizationId: 'org-a',
      orderId: 'order-other',
      orderNumber: OTHER_CUSTOMER.orderNumber,
      partyId: 'party-other',
      customerName: OTHER_CUSTOMER.customerName,
      ownerMemberId: 'luis',
      ownerLabel: 'Luis',
    },
    {
      organizationId: 'org-b',
      orderId: 'order-foreign',
      orderNumber: FOREIGN.orderNumber,
      partyId: 'party-foreign',
      customerName: FOREIGN.customerName,
      ownerMemberId: 'ana',
      ownerLabel: 'Ana',
    },
  ],
  lines: [
    {
      organizationId: 'org-a',
      orderId: 'order-local',
      orderLineId: 'line-local',
      description: 'Jarra blanca',
      quantity: 2,
    },
    {
      organizationId: 'org-a',
      orderId: 'order-other',
      orderLineId: 'line-other',
      description: OTHER_CUSTOMER.lineText,
      quantity: 4,
    },
    {
      organizationId: 'org-b',
      orderId: 'order-foreign',
      orderLineId: 'line-foreign',
      description: FOREIGN.lineText,
      quantity: 9,
    },
  ],
  cases: [
    {
      organizationId: 'org-a',
      orderId: 'order-local',
      caseId: 'case-local',
      customerName: 'Cerámica Local',
      orderNumber: 'PED-100',
      lineText: 'Jarra blanca',
      evidenceText: 'Anotación local',
    },
    {
      organizationId: 'org-a',
      orderId: 'order-other',
      caseId: 'case-other',
      customerName: OTHER_CUSTOMER.customerName,
      orderNumber: OTHER_CUSTOMER.orderNumber,
      lineText: OTHER_CUSTOMER.lineText,
      evidenceText: 'Anotación de otro cliente',
    },
    {
      organizationId: 'org-b',
      orderId: 'order-foreign',
      caseId: 'case-foreign',
      customerName: FOREIGN.customerName,
      orderNumber: FOREIGN.orderNumber,
      lineText: FOREIGN.lineText,
      evidenceText: 'Anotación de otro local',
    },
  ],
  grants: [
    buildCustomerCoverageGrant({
      organizationId: 'org-a',
      customerPartyId: 'party-local',
      primaryOwnerMemberId: 'ana',
      actingAdvisorMemberId: 'bruno',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    })!,
  ],
};

const ids: Record<PedidoResource, { local: string; other: string; foreign: string }> = {
  order: { local: 'order-local', other: 'order-other', foreign: 'order-foreign' },
  order_line: { local: 'line-local', other: 'line-other', foreign: 'line-foreign' },
  operational_case: { local: 'case-local', other: 'case-other', foreign: 'case-foreign' },
};

function session(overrides: Partial<PedidoSession> = {}): PedidoSession {
  return {
    organizationId: 'org-a',
    memberId: 'ana',
    grantedScopes: [],
    cargo: null,
    title: null,
    asOf,
    ...overrides,
  };
}

function secrets(...groups: Array<Record<string, string>>): string[] {
  return groups.flatMap((group) => Object.values(group));
}

function assertDenied(value: unknown, reason: string, hidden: string[]) {
  assert.equal((value as { ok: boolean }).ok, false);
  assert.equal((value as { reason: string }).reason, reason);
  assert.deepEqual(Object.keys(value as object).sort(), ['ok', 'reason']);
  const copy = JSON.stringify(value);
  for (const secret of hidden) {
    assert.equal(copy.includes(secret), false, secret);
  }
}

describe('pedido resource access', () => {
  for (const resource of ['order', 'order_line', 'operational_case'] as const) {
    describe(resource, () => {
      it('allows the owner in the same tenant', () => {
        const result = readPedidoResource(resource, session(), store, ids[resource].local);
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.equal(result.resource, resource);
        if (result.resource === 'operational_case') {
          assert.equal(result.confirmsPayment, false);
        }
      });

      it('denies an unauthorized role in the same tenant without echoing the record', () => {
        const result = readPedidoResource(
          resource,
          session({ memberId: 'otra', grantedScopes: ['people.admin'], cargo: 'Jefe', title: 'Gerencia' }),
          store,
          ids[resource].local,
        );
        assertDenied(result, 'unauthorized_role', ['Cerámica Local', 'PED-100', 'Jarra blanca']);
      });

      it('denies another tenant without customer name, order number, or line text', () => {
        const result = readPedidoResource(resource, session(), store, ids[resource].foreign);
        assertDenied(result, 'cross_tenant', secrets(FOREIGN));
      });

      it('denies a direct call that supplies an organization id without a session org', () => {
        const result = readPedidoResource(
          resource,
          session({ organizationId: null }),
          store,
          ids[resource].foreign,
          'org-b',
        );
        assertDenied(result, 'missing_session_org', secrets(FOREIGN));
      });

      it('denies a search that would leak another tenant', () => {
        const result = searchPedidoResource(resource, session(), store, FOREIGN.orderNumber, 'org-b');
        assertDenied(result, 'search_denied', secrets(FOREIGN));
      });

      it('denies an aggregate that would include another tenant', () => {
        const result = aggregatePedidoResource(resource, session(), store, {
          requestedOrganizationId: 'org-b',
        });
        assertDenied(result, 'aggregate_denied', secrets(FOREIGN, OTHER_CUSTOMER));
      });
    });
  }

  it('coverage of one customer does not reveal another customer or another tenant', () => {
    const advisor = session({ memberId: 'bruno' });
    assert.equal(memberScopesCoverAllCustomers(advisor.grantedScopes), false);

    const allowed = readPedidoResource('order', advisor, store, 'order-local');
    assert.equal(allowed.ok, true);
    if (allowed.ok && allowed.resource === 'order') {
      assert.equal(allowed.ownerMemberId, 'ana');
      assert.equal(allowed.sharedOwnership, false);
    }

    assertDenied(
      readPedidoResource('order', advisor, store, 'order-other'),
      'unauthorized_role',
      secrets(OTHER_CUSTOMER, FOREIGN),
    );
    assertDenied(
      readPedidoResource('order_line', advisor, store, 'line-other'),
      'unauthorized_role',
      secrets(OTHER_CUSTOMER),
    );
    assertDenied(
      readPedidoResource('operational_case', advisor, store, 'case-other'),
      'unauthorized_role',
      secrets(OTHER_CUSTOMER),
    );
    assertDenied(
      readPedidoResource('operational_case', advisor, store, 'case-foreign'),
      'cross_tenant',
      secrets(FOREIGN),
    );
    assertDenied(
      searchPedidoResource('order', advisor, store, OTHER_CUSTOMER.customerName),
      'search_denied',
      secrets(OTHER_CUSTOMER, FOREIGN),
    );
    assertDenied(
      aggregatePedidoResource('order', advisor, store, { partyId: 'party-other' }),
      'aggregate_denied',
      secrets(OTHER_CUSTOMER, FOREIGN),
    );

    const counted = aggregatePedidoResource('order', advisor, store, {});
    assert.equal(counted.ok, true);
    if (!counted.ok) return;
    assert.equal(counted.count, 1);
    const copy = JSON.stringify(counted);
    for (const secret of secrets(OTHER_CUSTOMER, FOREIGN)) {
      assert.equal(copy.includes(secret), false, secret);
    }
  });

  it('does not treat cargo as exception authorization', () => {
    assert.equal(cargoGrantsExceptionAuthorization('Jefe', 'Gerencia'), false);
    assert.equal(
      canAuthorizeCommercialException(session({ cargo: 'Jefe', title: 'Gerencia' })),
      false,
    );
    assert.equal(
      canAuthorizeCommercialException(
        session({ grantedScopes: [COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE] }),
      ),
      true,
    );
  });
});
