/**
 * RC3 regression: Pedido commercial reads use leadership visibility
 * (canReadOwnedRecord / resolveOwnerReadScope), not people.admin-or-owner.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommercialQueryService } from './commercial-query-service';
import type { QueryContext } from '../query-context';
import type { StoredOrderReadModel } from '../projection-store-port';

const AS_OF = new Date('2026-09-17T16:00:00.000Z');
const ORG = 'org-synth';
const OTHER_ORG = 'org-real';
const CARMEN = 'mem-carmen';
const ASESOR = 'mem-asesor';
const OTHER_ASESOR = 'mem-asesor-2';
const MADERAS_ORDER = '01M2PMA280KX4AAV7049YKNE07';
const MADERAS_PARTY = '01M2PM95PV7YP6AECYXSX4GRBW';

function ctx(
  memberId: string,
  roleKeys: string[],
  organizationId = ORG,
): QueryContext {
  return {
    organizationId,
    actorMemberId: memberId,
    personId: `person-${memberId}`,
    authIdentityId: `auth-${memberId}`,
    correlationId: 'corr-rc3',
    effectiveAt: AS_OF,
    auth: {
      memberId,
      organizationId,
      accessStatus: 'active',
      roleKeys,
      delegatedScopes: [],
      delegatedApproverFor: [],
    },
  };
}

function order(
  orderId: string,
  ownerMemberId: string,
  extras: Partial<StoredOrderReadModel> = {},
): StoredOrderReadModel {
  return {
    orderId,
    organizationId: ORG,
    partyId: MADERAS_PARTY,
    commercialAccountId: null,
    quoteId: 'q-1',
    ownerMemberId,
    orderNumber: orderId === MADERAS_ORDER ? 'O-000002' : orderId,
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: 10n,
    headerDiscountCentavos: 0n,
    totalCentavos: 10n,
    cancelledAt: null,
    createdAt: AS_OF,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: AS_OF,
    ...extras,
  };
}

function service(orders: StoredOrderReadModel[]) {
  return new CommercialQueryService({
    projectionStore: {
      async getFreshness() {
        return { isStale: false };
      },
      async listOrderReadModels(
        organizationId: string,
        query: { ownerMemberId?: string; ownerMemberIds?: readonly string[]; partyId?: string },
      ) {
        return {
          hasMore: false,
          items: orders.filter((item) => {
            if (item.organizationId !== organizationId) return false;
            if (query.partyId && item.partyId !== query.partyId) return false;
            if (query.ownerMemberId && item.ownerMemberId !== query.ownerMemberId) return false;
            if (query.ownerMemberIds && !query.ownerMemberIds.includes(item.ownerMemberId)) {
              return false;
            }
            return true;
          }),
        };
      },
      async getOrderReadModel(organizationId: string, orderId: string) {
        return (
          orders.find((item) => item.organizationId === organizationId && item.orderId === orderId) ??
          null
        );
      },
    } as never,
    encodeOpportunityCursor: () => 'c',
    encodeQuoteCursor: () => 'c',
    encodeOrderCursor: () => 'c',
    directReports: {
      async listDirectReportMemberIds() {
        return [ASESOR];
      },
    },
  });
}

describe('RC3 order owner-evaluation reads', () => {
  const seeded = [
    order(MADERAS_ORDER, ASESOR),
    order('o-self', CARMEN, { partyId: 'party-other' }),
    order('o-foreign', ASESOR, { organizationId: OTHER_ORG, partyId: 'party-x' }),
  ];

  it('A: commercial.org.read owner-eval may read seeded Maderas Pedido (not owner, not people.admin)', async () => {
    const svc = service(seeded);
    const carmen = ctx(CARMEN, ['commercial.org.read', 'member_active']);
    const detail = await svc.getOrder(carmen, MADERAS_ORDER);
    assert.equal(detail.order.orderId, MADERAS_ORDER);
    assert.equal(detail.order.ownerMemberId, ASESOR);
    assert.equal(detail.order.partyId, MADERAS_PARTY);
  });

  it('B/C: team visibility lists only direct-report owners; org lists tenant', async () => {
    const svc = service(seeded);
    const jefe = ctx(CARMEN, ['commercial.team.read', 'member_active']);
    const team = await svc.listOrders(jefe, { visibility: 'team', limit: 25 });
    assert.deepEqual(
      team.items.map((i) => i.orderId).sort(),
      [MADERAS_ORDER],
    );

    const gerente = ctx(CARMEN, ['commercial.org.read', 'member_active']);
    const org = await svc.listOrders(gerente, { visibility: 'org', limit: 25 });
    assert.deepEqual(
      org.items.map((i) => i.orderId).sort(),
      [MADERAS_ORDER, 'o-self'],
    );
  });

  it('D: advisor without org/team read cannot open another advisor Pedido', async () => {
    const svc = service(seeded);
    const asesor = ctx(OTHER_ASESOR, ['member_active']);
    await assert.rejects(
      () => svc.getOrder(asesor, MADERAS_ORDER),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('E: cross-company Pedido id is not found in actor org (no foreign leak)', async () => {
    const svc = service(seeded);
    const carmen = ctx(CARMEN, ['commercial.org.read', 'member_active']);
    await assert.rejects(
      () => svc.getOrder(carmen, 'o-foreign'),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('F: REAL-org actor cannot see SYNTH Pedido via org id mismatch', async () => {
    const svc = service(seeded);
    const realActor = ctx(CARMEN, ['commercial.org.read', 'member_active'], OTHER_ORG);
    await assert.rejects(
      () => svc.getOrder(realActor, MADERAS_ORDER),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('G: Cliente360 party list with visibility=org returns seeded Pedido count', async () => {
    const svc = service(seeded);
    const carmen = ctx(CARMEN, ['commercial.org.read', 'member_active']);
    const listed = await svc.listOrders(carmen, {
      partyId: MADERAS_PARTY,
      visibility: 'org',
      limit: 10,
    });
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0]?.orderId, MADERAS_ORDER);
    const ownLens = await svc.listOrders(carmen, { partyId: MADERAS_PARTY, limit: 10 });
    assert.equal(ownLens.items.length, 0);
  });
});
