import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { PartyQueryService } from './party-query-service';
import type { CustomerVisibilityFacts, CustomerVisibilityLookup } from './customer-visibility';

/** Actor 'mem' owns the listed customer accounts. */
function ownedBy(memberId: string, partyIds: string[], extra: CustomerVisibilityFacts[] = []): CustomerVisibilityLookup {
  const facts: CustomerVisibilityFacts[] = [
    ...partyIds.map((partyId) => ({
      organizationId: 'org',
      partyId,
      hasCommercialAccount: true,
      accountOwnerMemberId: memberId,
      activeRoleKeys: ['customer'],
    })),
    ...extra,
  ];
  return {
    getCustomerFacts: async (_org, id) => facts.find((f) => f.partyId === id) ?? null,
    listCustomerFacts: async (_org, ids) => facts.filter((f) => ids.includes(f.partyId)),
    listPartyIdsOwnedBy: async (_org, owners) =>
      facts.filter((f) => f.accountOwnerMemberId && owners.includes(f.accountOwnerMemberId)).map((f) => f.partyId),
    listActiveCoverageForAdvisor: async () => [],
  };
}

const memCtx = (roleKeys: string[] = []) => ({
  organizationId: 'org',
  actorMemberId: 'mem',
  personId: 'per',
  authIdentityId: 'auth',
  correlationId: 'corr',
  effectiveAt: new Date('2026-09-14T06:00:00.000Z'),
  auth: {
    organizationId: 'org',
    memberId: 'mem',
    accessStatus: 'active' as const,
    roleKeys,
    delegatedScopes: [],
    delegatedApproverFor: [],
  },
});

const party = (partyId: string): PartySummaryReadModel => ({
  partyId,
  organizationId: 'org',
  partyKind: 'organization',
  displayName: partyId,
  legalName: null,
  status: 'active',
  activeRoleKeys: ['customer'],
  hasCommercialAccount: true,
  commercialAccountStatus: 'active',
  mergedIntoPartyId: null,
  duplicateStatus: null,
  searchText: partyId,
});

describe('party search operating facts', () => {
  it('attaches owner, phone, and coordinates in one batch', async () => {
    let calls = 0;
    const service = new PartyQueryService({
      projectionStore: {
        searchParties: async () => ({ items: [party('p1'), party('p2')], hasMore: false }),
        getFreshness: async () => null,
      } as never,
      encodeCursor: () => 'cursor',
      customerVisibility: ownedBy('mem', ['p1', 'p2']),
      listOperatingSources: async (_org, partyIds) => {
        calls += 1;
        assert.deepEqual(partyIds, ['p1', 'p2']);
        return [
          {
            partyId: 'p1',
            contacts: [{ id: 'c1', status: 'active', phone: '70000000' }],
            locations: [
              {
                status: 'active',
                latitude: null,
                longitude: null,
                provenanceUrl: 'https://maps.example/shared',
              },
            ],
            commercialOwnerMemberId: 'mem-isa',
          },
          {
            partyId: 'p2',
            contacts: [],
            locations: [
              {
                status: 'active',
                latitude: -17.7,
                longitude: -63.1,
                provenanceUrl: null,
              },
            ],
            commercialOwnerMemberId: null,
          },
        ];
      },
    });

    const result = await service.searchParties(
      {
        organizationId: 'org',
        actorMemberId: 'mem',
        personId: 'per',
        authIdentityId: 'auth',
        correlationId: 'corr',
        effectiveAt: new Date('2026-09-14T06:00:00.000Z'),
        auth: {
          organizationId: 'org',
          memberId: 'mem',
          accessStatus: 'active',
          roleKeys: [],
          delegatedScopes: [],
          delegatedApproverFor: [],
        },
      },
      { limit: 25 },
    );

    assert.equal(calls, 1);
    assert.equal(result.items[0]?.primaryPhone, '70000000');
    assert.equal(result.items[0]?.commercialOwnerMemberId, 'mem-isa');
    assert.equal(result.items[0]?.hasCoordinates, false);
    assert.equal(result.items[0]?.locationProvenanceUrl, 'https://maps.example/shared');
    assert.equal(result.items[1]?.primaryPhone, null);
    assert.equal(result.items[1]?.hasCoordinates, true);
  });

  it('T02: passes the server-resolved scope to the store and drops rows the read model misclassified', async () => {
    const seen: unknown[] = [];
    const lagging = { ...party('lagging'), activeRoleKeys: ['supplier'], hasCommercialAccount: false };
    const supplierRow = { ...party('supp'), activeRoleKeys: ['supplier'], hasCommercialAccount: false };
    const service = new PartyQueryService({
      projectionStore: {
        searchParties: async (_org: string, _q: unknown, visibility: unknown) => {
          seen.push(visibility);
          return { items: [party('p1'), lagging, supplierRow], hasMore: false };
        },
        getFreshness: async () => null,
      } as never,
      encodeCursor: () => 'cursor',
      customerVisibility: ownedBy('mem', ['p1'], [
        // Source tables: 'lagging' is already a customer owned by someone else.
        { organizationId: 'org', partyId: 'lagging', hasCommercialAccount: true, accountOwnerMemberId: 'other', activeRoleKeys: ['customer'] },
        { organizationId: 'org', partyId: 'supp', hasCommercialAccount: false, accountOwnerMemberId: null, activeRoleKeys: ['supplier'] },
      ]),
    });
    const result = await service.searchParties(memCtx(['people.admin']) as never, { limit: 25 });
    assert.deepEqual(seen, [{ partyIds: ['p1'] }]);
    assert.deepEqual(result.items.map((i) => i.partyId), ['p1', 'supp']);
  });

  it('T02: commercial.org.read searches the tenant without a party filter', async () => {
    const seen: unknown[] = [];
    const service = new PartyQueryService({
      projectionStore: {
        searchParties: async (_org: string, _q: unknown, visibility: unknown) => {
          seen.push(visibility);
          return { items: [party('p9')], hasMore: false };
        },
        getFreshness: async () => null,
      } as never,
      encodeCursor: () => 'cursor',
      customerVisibility: ownedBy('nobody', []),
    });
    const result = await service.searchParties(memCtx(['commercial.org.read']) as never, { limit: 25 });
    assert.deepEqual(seen, [undefined]);
    assert.deepEqual(result.items.map((i) => i.partyId), ['p9']);
  });
});

describe('master-data lookup (T03 2026-10-16 19:30)', () => {
  const rows: PartySummaryReadModel[] = [
    { ...party('p1'), displayName: 'Ferretería Norte', legalName: 'Ferretería Norte S.R.L.', searchText: 'ferreteria norte juan perez 70011122 juan@norte.bo' },
    { ...party('p2'), displayName: 'Constructora Sur', legalName: null, searchText: 'constructora sur ana 70099988' },
  ];
  const service = (seen: Array<{ partyIds?: string[] } | undefined> = []) =>
    new PartyQueryService({
      projectionStore: {
        searchParties: async (_org: string, _query: unknown, filter?: { partyIds?: string[] }) => {
          seen.push(filter);
          return { items: rows, hasMore: false };
        },
        getFreshness: async () => null,
      } as never,
      encodeCursor: () => 'cursor',
      customerVisibility: ownedBy('someone-else', []),
    });

  it('lets master_data.admin find customers by name without commercial read or contact fields', async () => {
    const seen: Array<{ partyIds?: string[] } | undefined> = [];
    const result = await service(seen).searchMasterDataParties(memCtx(['master_data.admin']), { q: 'ferreteria', limit: 20 });
    assert.deepEqual(seen, [undefined], 'org-wide lookup, not the commercial visibility filter');
    assert.deepEqual(result.items.map((i) => i.partyId), ['p1']);
    assert.deepEqual(Object.keys(result.items[0]!).sort(), [
      'activeRoleKeys',
      'displayName',
      'legalName',
      'mergedIntoPartyId',
      'partyId',
      'partyKind',
      'status',
    ]);
  });

  it('does not match on contact names, phones or emails', async () => {
    for (const q of ['juan', '70011122', 'juan@norte.bo', 'ana']) {
      const result = await service().searchMasterDataParties(memCtx(['master_data.admin']), { q, limit: 20 });
      assert.deepEqual(result.items, [], q);
    }
  });

  it('refuses callers without master_data.admin, including commercial readers', async () => {
    for (const roles of [[], ['commercial.org.read'], ['people.admin']]) {
      await assert.rejects(() => service().searchMasterDataParties(memCtx(roles), { q: 'ferreteria', limit: 20 }), roles.join(','));
    }
  });
});

describe('party search legal name (T03 contract C3)', () => {
  const search = (roleKeys: string[]) =>
    new PartyQueryService({
      projectionStore: {
        searchParties: async () => ({ items: [{ ...party('p1'), legalName: 'Razón Social C3 SRL' }], hasMore: false }),
        getFreshness: async () => null,
      } as never,
      encodeCursor: () => 'cursor',
      customerVisibility: ownedBy('mem', ['p1']),
    }).searchParties(memCtx(roleKeys), { limit: 25 } as never);

  it('returns the legal name only to a data steward', async () => {
    for (const roleKeys of [[], ['commercial.customer.edit'], ['commercial.org.read', 'commercial.customer.edit']]) {
      const result = await search(roleKeys);
      assert.equal(result.items.length, 1, JSON.stringify(roleKeys));
      assert.equal(result.items[0]!.legalName, null, JSON.stringify(roleKeys));
      assert.doesNotMatch(JSON.stringify(result), /Razón Social C3/);
    }
    const steward = await search(['master_data.admin']);
    assert.equal(steward.items[0]!.legalName, 'Razón Social C3 SRL');
  });
});
