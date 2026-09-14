import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ProjectionFreshness } from '@isalwa/os-contracts';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { loadCliente360 } from '@/lib/cliente/load-cliente-360';
import type { OpportunityListResponse } from '@/lib/commercial/types';
import { isProjectionStale } from '@/lib/query/projection-freshness';

const emptyMeta = { nextCursor: null as string | null, limit: 10, hasMore: false };

const partyDetail = {
  party: {
    id: 'party-1',
    organizationId: 'org-1',
    partyKind: 'organization',
    displayName: 'Cliente Step17 S.A.',
    legalName: 'Cliente Step17 S.A.',
    status: 'active',
    mergedIntoPartyId: null,
    version: 1,
  },
  roles: [],
  contacts: [],
  commercialAccount: null,
};

function freshness(isStale: boolean): ProjectionFreshness {
  return {
    consumerKey: 'projection.commercial.summary.v1',
    organizationId: 'org-1',
    lastSuccessAt: '2026-08-27T12:00:00.000Z',
    lastEventOccurredAt: null,
    pendingOutboxCount: isStale ? 2 : 0,
    isStale,
    lastError: null,
    rebuiltAt: null,
  };
}

function emptyList(fresh: ProjectionFreshness | null): OpportunityListResponse {
  return { items: [], meta: emptyMeta, freshness: fresh };
}

function mockClient(overrides: {
  opportunities?: ReturnType<typeof emptyList>;
  quotes?: ReturnType<typeof emptyList>;
  orders?: ReturnType<typeof emptyList>;
  timeline?: ReturnType<typeof emptyList>;
  work?: ReturnType<typeof emptyList>;
}): OsApiClient {
  return {
    getParty: async () => partyDetail,
    listOpportunities: async () => overrides.opportunities ?? emptyList(null),
    listQuotes: async () => overrides.quotes ?? emptyList(null),
    listOrders: async () => overrides.orders ?? emptyList(null),
    listPartyTimeline: async () => overrides.timeline ?? emptyList(null),
    listWorkItems: async () => overrides.work ?? emptyList(null),
    listPartyLocations: async () => ({ partyId: 'party-1', locations: [] }),
    listMembers: async () => ({ items: [], meta: emptyMeta }),
  } as unknown as OsApiClient;
}

describe('isProjectionStale', () => {
  it('treats null/undefined as not stale', () => {
    assert.equal(isProjectionStale(null), false);
    assert.equal(isProjectionStale(undefined), false);
  });

  it('reads isStale when freshness is present', () => {
    assert.equal(isProjectionStale(freshness(false)), false);
    assert.equal(isProjectionStale(freshness(true)), true);
  });
});

describe('loadCliente360 null freshness', () => {
  it('loads with null freshness on empty opportunities', async () => {
    const data = await loadCliente360(
      mockClient({ opportunities: emptyList(null) }),
      'party-1',
    );
    assert.equal(data.detail.party.displayName, 'Cliente Step17 S.A.');
    assert.equal(data.opportunities.status, 'ok');
    if (data.opportunities.status === 'ok') {
      assert.equal(data.opportunities.data.items.length, 0);
      assert.equal(data.opportunities.data.freshness, null);
    }
    assert.equal(data.staleFreshness, false);
  });

  it('loads with null freshness on empty quotes', async () => {
    const data = await loadCliente360(mockClient({ quotes: emptyList(null) }), 'party-1');
    assert.equal(data.quotes.status, 'ok');
    assert.equal(data.staleFreshness, false);
  });

  it('loads with null freshness on empty orders', async () => {
    const data = await loadCliente360(mockClient({ orders: emptyList(null) }), 'party-1');
    assert.equal(data.orders.status, 'ok');
    assert.equal(data.staleFreshness, false);
  });

  it('loads with null freshness on empty work', async () => {
    const data = await loadCliente360(mockClient({ work: emptyList(null) }), 'party-1');
    assert.equal(data.relatedWork.status, 'ok');
    assert.equal(data.staleFreshness, false);
  });

  it('loads when all commercial sections have null freshness', async () => {
    const data = await loadCliente360(mockClient({}), 'party-1');
    assert.equal(data.staleFreshness, false);
    assert.equal(data.opportunities.status, 'ok');
    assert.equal(data.quotes.status, 'ok');
    assert.equal(data.orders.status, 'ok');
    assert.equal(data.relatedWork.status, 'ok');
    assert.equal(data.locations.status, 'ok');
  });

  it('does not mark stale when freshness present and isStale=false', async () => {
    const fresh = freshness(false);
    const data = await loadCliente360(
      mockClient({
        opportunities: emptyList(fresh),
        quotes: emptyList(fresh),
        orders: emptyList(fresh),
        work: emptyList(fresh),
        timeline: emptyList(fresh),
      }),
      'party-1',
    );
    assert.equal(data.staleFreshness, false);
  });

  it('marks stale when freshness present and isStale=true', async () => {
    const data = await loadCliente360(
      mockClient({
        opportunities: emptyList(freshness(true)),
        quotes: emptyList(null),
        orders: emptyList(null),
        work: emptyList(null),
      }),
      'party-1',
    );
    assert.equal(data.staleFreshness, true);
  });

  it('one null section does not break other populated sections', async () => {
    const data = await loadCliente360(
      mockClient({
        opportunities: {
          items: [
            {
              opportunityId: 'opp-1',
              organizationId: 'org-1',
              partyId: 'party-1',
              commercialAccountId: null,
              ownerMemberId: 'mem-1',
              title: 'UAT opp',
              stage: 'qualification',
              status: 'open',
              expectedValueCentavos: null,
              closedAt: null,
              createdAt: '2026-08-27T12:00:00.000Z',
            },
          ],
          meta: emptyMeta,
          freshness: freshness(false),
        },
        quotes: emptyList(null),
        orders: emptyList(null),
        work: emptyList(null),
        timeline: emptyList(null),
      }),
      'party-1',
    );
    assert.equal(data.opportunities.status, 'ok');
    if (data.opportunities.status === 'ok') {
      assert.equal(data.opportunities.data.items.length, 1);
      assert.equal(data.opportunities.data.items[0]?.title, 'UAT opp');
    }
    assert.equal(data.quotes.status, 'ok');
    assert.equal(data.staleFreshness, false);
  });
});
