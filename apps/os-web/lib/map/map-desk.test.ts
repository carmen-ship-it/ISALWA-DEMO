import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAP_LAYER_REGISTRY, resolveMapLayer } from './layers';
import { resolveMapProviderStatus } from './provider-status';

describe('map provider status', () => {
  it('does not connect Mapbox when token is missing', () => {
    const status = resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: '' });
    assert.equal(status.kind, 'unavailable');
    assert.equal(status.tokenPresent, false);
    assert.match(status.detail, /Vista geográfica en preparación|proveedor geográfico|ubicación ya está organizada/i);
  });

  it('enables live mapbox when token is present', () => {
    const status = resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: 'pk.test' });
    assert.equal(status.kind, 'live');
    assert.equal(status.tokenPresent, true);
    assert.match(status.detail, /coordenadas confirmadas|enlace de mapas/i);
    assert.doesNotMatch(status.detail, /teselas|MapLibre|error|failed/i);
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

describe('copy contracts — no fake streets or provider-error wording', () => {
  it('provider status never mentions "error", "failed", or "broken"', () => {
    const allStatuses = [
      resolveMapProviderStatus({ mapsProvider: null, mapboxToken: null }),
      resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: '' }),
      resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: 'pk.test' }),
      resolveMapProviderStatus({ mapsProvider: 'mock', mapboxToken: null }),
    ];
    for (const status of allStatuses) {
      const combined = `${status.label} ${status.detail}`.toLowerCase();
      assert.doesNotMatch(combined, /error|failed|broken|falló|roto/i);
    }
  });

  it('provider label uses preparation copy except when live', () => {
    const unwired = [
      resolveMapProviderStatus({ mapsProvider: null, mapboxToken: null }),
      resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: '' }),
      resolveMapProviderStatus({ mapsProvider: 'mock', mapboxToken: null }),
    ];
    for (const status of unwired) {
      assert.equal(status.label, 'Vista geográfica en preparación');
    }
    assert.equal(
      resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: 'pk.test' }).label,
      'Mapa activo',
    );
  });

  it('provider detail never invents streets, heatmaps, or pins', () => {
    const allStatuses = [
      resolveMapProviderStatus({ mapsProvider: null, mapboxToken: null }),
      resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: '' }),
      resolveMapProviderStatus({ mapsProvider: 'mapbox', mapboxToken: 'pk.test' }),
      resolveMapProviderStatus({ mapsProvider: 'mock', mapboxToken: null }),
    ];
    for (const status of allStatuses) {
      assert.doesNotMatch(status.detail, /calle.*falsa|fake.*street|heatmap.*falso|pin.*inventado/i);
    }
  });

  it('provider detail uses intentional preparation language, not error', () => {
    const defaultStatus = resolveMapProviderStatus({ mapsProvider: null, mapboxToken: null });
    assert.match(defaultStatus.detail, /proveedor geográfico|visualización completa/i);
    assert.doesNotMatch(defaultStatus.detail, /error|fallo|broken|teselas|MapLibre|Mapbox/i);
  });

  it('layer registry forbids future layers from being truth-available', () => {
    const futureLayers = MAP_LAYER_REGISTRY.filter((l) => l.truthClass === 'future');
    assert.ok(futureLayers.length > 0, 'should have future layers');
    for (const layer of futureLayers) {
      // Future layers should be blocked from resolving as active
      assert.equal(resolveMapLayer(layer.id), 'clientes');
    }
  });
});
