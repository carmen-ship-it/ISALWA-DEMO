import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OsApiError } from '@/lib/api/os-api-errors';
import {
  loadMasterDataLookup,
  masterDataLookupHref,
  masterDataLookupQuery,
} from '@/lib/party/master-data-lookup';
import type { MasterDataPartyDetailResponse, MasterDataPartySearchResponse } from '@/lib/party/types';

const andina = {
  partyId: 'p-andina',
  partyKind: 'organization',
  displayName: 'Andina',
  legalName: 'Andina SRL',
  status: 'active',
  activeRoleKeys: ['customer'],
  mergedIntoPartyId: null,
};

function apiError(kind: 'forbidden' | 'not_found', status: number, code: string) {
  return new OsApiError({ kind, status, code, message: code });
}

function fakeClient(opts: { forbidden?: boolean } = {}) {
  const calls: string[] = [];
  return {
    calls,
    async searchMasterDataParties(query: { q?: string; nit?: string }): Promise<MasterDataPartySearchResponse> {
      calls.push(`search:${JSON.stringify(query)}`);
      if (opts.forbidden) throw apiError('forbidden', 403, 'PERMISSION_DENIED');
      const hit = query.nit === '1020304' || query.q === 'Andina';
      return { items: hit ? [andina] : [], meta: { nextCursor: null, limit: 25, hasMore: false } };
    },
    async getMasterDataParty(partyId: string): Promise<MasterDataPartyDetailResponse> {
      calls.push(`detail:${partyId}`);
      if (opts.forbidden) throw apiError('forbidden', 403, 'PERMISSION_DENIED');
      if (partyId !== andina.partyId) throw apiError('not_found', 404, 'NOT_FOUND');
      return {
        ...andina,
        version: 3,
        fiscalIdentities: [{ nit: '1020304', razonSocial: 'Andina SRL', effectiveAt: '2026-01-01T00:00:00.000Z', endedAt: null }],
      };
    },
  };
}

describe('T03 data-steward lookup (customer screens)', () => {
  it('only a steward gets a lookup; a non-steward makes no request', async () => {
    const client = fakeClient();
    assert.equal(await loadMasterDataLookup(client, { isSteward: false, term: 'Andina', partyId: andina.partyId }), null);
    assert.deepEqual(client.calls, []);
    assert.equal(await loadMasterDataLookup(fakeClient({ forbidden: true }), { isSteward: true, term: 'Andina' }), null);
  });

  it('digits search by NIT, words by name; too short searches nothing', async () => {
    assert.deepEqual(masterDataLookupQuery(' 1020304 '), { nit: '1020304' });
    assert.deepEqual(masterDataLookupQuery('Andina SRL'), { q: 'Andina SRL' });
    assert.equal(masterDataLookupQuery('a'), null);
    const client = fakeClient();
    const byNit = await loadMasterDataLookup(client, { isSteward: true, term: '1020304' });
    assert.equal(byNit?.searchedBy, 'nit');
    assert.deepEqual(byNit?.rows.map((row) => row.partyId), [andina.partyId]);
    const empty = await loadMasterDataLookup(client, { isSteward: true, term: '' });
    assert.deepEqual([empty?.searchedBy, empty?.rows.length], [null, 0]);
    assert.deepEqual(client.calls, ['search:{"nit":"1020304"}']);
  });

  it('selected record shows fiscal identity; a missing id says not found', async () => {
    const found = await loadMasterDataLookup(fakeClient(), { isSteward: true, term: 'Andina', partyId: andina.partyId });
    assert.equal(found?.selected?.fiscalIdentities[0]?.nit, '1020304');
    assert.equal(found?.selected?.legalName, 'Andina SRL');
    const missing = await loadMasterDataLookup(fakeClient(), { isSteward: true, term: 'Andina', partyId: 'nope' });
    assert.deepEqual([missing?.selected, missing?.selectedMissing], [null, true]);
  });

  it('result links keep the search term', () => {
    assert.equal(masterDataLookupHref('/clientes', ' Andina ', 'p-andina'), '/clientes?custodio=Andina&custodioId=p-andina');
    assert.equal(masterDataLookupHref('/clientes', ''), '/clientes');
  });
});
