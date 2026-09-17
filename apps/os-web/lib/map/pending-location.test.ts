import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAuthoritativeRevenueLayerEnabled } from './authoritative-revenue';
import { pendingLocationCta, partyMapLocationHref } from './pending-location';
import { MAP_LAYER_REGISTRY, resolveMapLayer } from './layers';

describe('pending location CTAs', () => {
  it('links to Cliente 360 ubicaciones — never geocodes on map', () => {
    assert.equal(partyMapLocationHref('party-1'), '/clientes/party-1#ubicaciones');
    const provenance = pendingLocationCta({
      partyId: 'p1',
      hasCoordinates: false,
      hasProvenance: true,
    });
    assert.ok(provenance);
    assert.match(provenance!.label, /Completar coordenadas/i);
    assert.equal(provenance!.href, '/clientes/p1#ubicaciones');

    const none = pendingLocationCta({
      partyId: 'p2',
      hasCoordinates: false,
      hasProvenance: false,
    });
    assert.ok(none);
    assert.match(none!.label, /Registrar ubicación/i);

    assert.equal(
      pendingLocationCta({ partyId: 'p3', hasCoordinates: true, hasProvenance: false }),
      null,
    );
  });
});

describe('authoritative revenue layer', () => {
  it('defaults to disabled unless AUTHORITATIVE_REVENUE_LAYER=YES', () => {
    assert.equal(isAuthoritativeRevenueLayerEnabled(undefined), false);
    assert.equal(isAuthoritativeRevenueLayerEnabled('NO'), false);
    assert.equal(isAuthoritativeRevenueLayerEnabled('yes'), false);
    assert.equal(isAuthoritativeRevenueLayerEnabled('YES'), true);
  });

  it('keeps ingresos layer out of available filters', () => {
    const ingresos = MAP_LAYER_REGISTRY.find((layer) => layer.id === 'ingresos');
    assert.ok(ingresos);
    assert.notEqual(ingresos!.truthClass, 'available');
    assert.equal(resolveMapLayer('ingresos'), 'clientes');
  });
});
