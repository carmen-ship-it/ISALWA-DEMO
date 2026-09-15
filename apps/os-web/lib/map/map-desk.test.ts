import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { buildMapDeskViewModel } from './build-view-model';
import { MAP_LAYER_REGISTRY, resolveMapLayer } from './layers';
import { resolveMapProviderStatus } from './provider-status';

function party(
  patch: Partial<PartySummaryReadModel> & Pick<PartySummaryReadModel, 'partyId' | 'displayName'>,
): PartySummaryReadModel {
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

describe('map provider status', () => {
  it('does not connect Mapbox when token is missing', () => {
    const status = resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: '' });
    assert.equal(status.kind, 'unavailable');
    assert.equal(status.tokenPresent, false);
    assert.match(status.detail, /No se inventan coordenadas|No se compra/);
  });

  it('reports token present without wiring the canvas', () => {
    const status = resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: 'pk.test' });
    assert.equal(status.kind, 'token_present_unwired');
    assert.equal(status.tokenPresent, true);
    assert.match(status.detail, /no se conecta solo|No se compra|sin comprar/i);
  });

  it('keeps mock unwired without purchasing', () => {
    const status = resolveMapProviderStatus({ mapsProvider: 'mock', mapboxToken: null });
    assert.equal(status.kind, 'mock_unwired');
    assert.equal(status.engine, 'maplibre');
  });
});

describe('map layers', () => {
  it('only clientes is available; future layers do not activate', () => {
    const available = MAP_LAYER_REGISTRY.filter((layer) => layer.truthClass === 'available');
    assert.deepEqual(
      available.map((layer) => layer.id),
      ['clientes'],
    );
    assert.equal(resolveMapLayer('cobranza'), 'clientes');
    assert.equal(resolveMapLayer('atencion'), 'clientes');
    assert.equal(resolveMapLayer('clientes'), 'clientes');
  });
});

describe('map desk view model', () => {
  it('reports hosted-style honesty without inventing pins', () => {
    const model = buildMapDeskViewModel([
      party({ partyId: '1', displayName: 'SYNTH Wave2 Cliente', hasCoordinates: false }),
    ]);
    assert.equal(model.coverage.honesty, '0 de 1 tienen coordenadas');
    assert.equal(model.plottable.length, 0);
    assert.equal(model.provenanceOnly.length, 0);
    assert.equal(model.noLocation.length, 1);
    assert.equal('latitude' in model.plottable, false);
  });

  it('separates plottable from provenance-only (pilot 2 de 7 shape)', () => {
    const model = buildMapDeskViewModel([
      party({ partyId: 'a', displayName: 'A', hasCoordinates: true }),
      party({ partyId: 'b', displayName: 'B', hasCoordinates: true }),
      party({
        partyId: 'c',
        displayName: 'MICRISTAL',
        hasCoordinates: false,
        locationProvenanceUrl: 'https://maps.example/shared',
      }),
      party({
        partyId: 'd',
        displayName: 'TORREZ',
        hasCoordinates: false,
        locationProvenanceUrl: 'https://maps.example/shared',
      }),
      party({
        partyId: 'e',
        displayName: 'E',
        hasCoordinates: false,
        locationProvenanceUrl: 'https://maps.example/e',
      }),
      party({ partyId: 'f', displayName: 'F', hasCoordinates: false }),
      party({ partyId: 'g', displayName: 'G', hasCoordinates: false }),
    ]);
    assert.equal(model.coverage.honesty, '2 de 7 tienen coordenadas');
    assert.equal(model.coverage.sentence, '2 de 7 clientes con ubicación disponible en mapa');
    assert.equal(model.plottable.length, 2);
    assert.equal(model.provenanceOnly.length, 3);
    assert.equal(model.noLocation.length, 2);
    assert.doesNotMatch(JSON.stringify(model), /-16\.|-17\.|geocode|heatmap/i);
  });

  it('returns null honesty when location facts are absent', () => {
    const model = buildMapDeskViewModel([
      party({ partyId: 'a', displayName: 'A' }),
    ]);
    assert.equal(model.coverage.honesty, null);
    assert.equal(model.coverage.factsPresent, false);
  });
});
