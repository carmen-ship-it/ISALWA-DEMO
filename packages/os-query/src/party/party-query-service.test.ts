import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { PartyQueryService } from './party-query-service';

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
});
