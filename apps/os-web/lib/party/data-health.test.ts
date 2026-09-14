import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { dataHealthFromSummaries, mapCoverage } from './data-health';

function party(patch: Partial<PartySummaryReadModel> & Pick<PartySummaryReadModel, 'partyId' | 'displayName'>): PartySummaryReadModel {
  return {
    organizationId: 'org',
    partyKind: 'organization',
    legalName: null,
    status: 'active',
    activeRoleKeys: ['customer'],
    hasCommercialAccount: true,
    commercialAccountStatus: 'active',
    mergedIntoPartyId: null,
    duplicateStatus: null,
    searchText: patch.displayName,
    ...patch,
  };
}

describe('data health from loaded customers', () => {
  it('reports a shared maps link without correcting it', () => {
    const issues = dataHealthFromSummaries([
      party({
        partyId: 'a',
        displayName: 'COMERCIAL MICRISTAL',
        hasCoordinates: false,
        locationProvenanceUrl: 'https://maps.example/shared',
        primaryPhone: '700',
        commercialOwnerMemberId: 'm1',
      }),
      party({
        partyId: 'b',
        displayName: 'COMERCIAL TORREZ',
        hasCoordinates: false,
        locationProvenanceUrl: 'HTTPS://maps.example/shared',
        primaryPhone: '701',
        commercialOwnerMemberId: 'm1',
      }),
    ]);
    const shared = issues.find((issue) => issue.id.startsWith('shared-provenance'));
    assert.match(shared?.what ?? '', /COMERCIAL MICRISTAL y COMERCIAL TORREZ comparten el mismo enlace/);
    assert.match(shared?.action ?? '', /No se fusiona/);
  });

  it('counts map coverage only from coordinates', () => {
    const coverage = mapCoverage([
      party({ partyId: 'a', displayName: 'A', hasCoordinates: true }),
      party({ partyId: 'b', displayName: 'B', hasCoordinates: false }),
    ]);
    assert.equal(coverage.sentence, '1 de 2 clientes con ubicación disponible en mapa');
  });
});
