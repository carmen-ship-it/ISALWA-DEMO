import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { DATA_HEALTH_BOUNDARY, MAP_COVERAGE_LIMIT, dataHealthFromSummaries, mapCoverage } from './data-health';

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
    assert.match(shared?.boundary ?? '', /No se elige un ganador/);
    assert.match(shared?.boundary ?? '', /No se geocodifica/);
    assert.equal('resolvedWinner' in (shared ?? {}), false);
    assert.doesNotMatch(JSON.stringify(issues), /ubicación correcta es|coordenada inventada|-16\./);
    assert.equal(DATA_HEALTH_BOUNDARY.includes('no geocodifica'), true);
  });

  it('counts map coverage only from coordinates', () => {
    const coverage = mapCoverage([
      party({ partyId: 'a', displayName: 'A', hasCoordinates: true }),
      party({ partyId: 'b', displayName: 'B', hasCoordinates: false }),
    ]);
    assert.equal(coverage.sentence, '1 de 2 clientes con ubicación disponible en mapa');
    assert.equal(coverage.limit, MAP_COVERAGE_LIMIT);
    assert.equal(coverage.withCoordinates, 1);
    assert.equal('coordinates' in coverage, false);
  });

  it('flags a maps link, a duplicate mark, and a repeated phone without resolving them', () => {
    const issues = dataHealthFromSummaries([
      party({
        partyId: 'a',
        displayName: 'A',
        hasCoordinates: false,
        locationProvenanceUrl: 'https://maps.example/a',
        primaryPhone: '700',
        duplicateStatus: 'suggested',
        commercialOwnerMemberId: 'm1',
      }),
      party({
        partyId: 'b',
        displayName: 'B',
        hasCoordinates: true,
        primaryPhone: '700',
        duplicateStatus: 'none',
        commercialOwnerMemberId: 'm1',
      }),
      party({
        partyId: 'c',
        displayName: '   ',
        hasCoordinates: false,
        commercialOwnerMemberId: 'm1',
      }),
    ]);

    const link = issues.find((issue) => issue.id === 'provenance-not-location');
    assert.match(link?.action ?? '', /No se convierte el enlace/);
    assert.match(link?.boundary ?? '', /No se geocodifica/);

    const duplicate = issues.find((issue) => issue.id === 'duplicate-review');
    assert.match(duplicate?.action ?? '', /No se fusiona/);
    assert.match(duplicate?.boundary ?? '', /No se elige un registro principal/);

    const phone = issues.find((issue) => issue.id.startsWith('shared-phone'));
    assert.match(phone?.what ?? '', /A y B comparten el mismo teléfono/);
    assert.match(phone?.boundary ?? '', /No se normaliza ni se fusiona/);

    const unnamed = issues.find((issue) => issue.id === 'missing-name');
    assert.match(unnamed?.boundary ?? '', /No se inventa un nombre/);
    assert.doesNotMatch(JSON.stringify(issues), /MICRISTAL|TORREZ|resuelto/);
  });
});
