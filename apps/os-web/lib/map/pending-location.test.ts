import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAuthoritativeRevenueLayerEnabled } from './authoritative-revenue';
import {
  partyMapLocationHref,
  pendingLocationCardCopy,
  pendingLocationCta,
} from './pending-location';
import { MAP_LAYER_REGISTRY, resolveMapLayer } from './layers';

describe('pending location helpers', () => {
  it('returns null CTA/card when coordinates are confirmed', () => {
    const row = { partyId: 'p1', hasCoordinates: true, hasProvenance: true };
    assert.equal(pendingLocationCta(row), null);
    assert.equal(pendingLocationCardCopy(row), null);
  });

  it('uses human pending copy and Completar ubicación CTA without jargon', () => {
    const withProvenance = pendingLocationCardCopy({
      partyId: 'p2',
      hasCoordinates: false,
      hasProvenance: true,
    });
    assert.ok(withProvenance);
    assert.equal(withProvenance.title, 'Ubicación por confirmar');
    assert.equal(withProvenance.cta, 'Completar ubicación');
    assert.equal(withProvenance.href, partyMapLocationHref('p2'));
    assert.doesNotMatch(withProvenance.helper, /provenance|geocod|latitud|longitud/i);

    const without = pendingLocationCardCopy({
      partyId: 'p3',
      hasCoordinates: false,
      hasProvenance: false,
    });
    assert.ok(without);
    assert.equal(without.tone, 'warning');
    assert.match(without.helper, /Todavía no hay un punto confirmado/);
  });

  it('keeps Completar ubicación CTA href on Cliente 360 ubicaciones', () => {
    const cta = pendingLocationCta({
      partyId: 'party-1',
      hasCoordinates: false,
      hasProvenance: false,
    });
    assert.ok(cta);
    assert.equal(cta.label, 'Completar ubicación');
    assert.equal(cta.href, '/clientes/party-1#ubicaciones');
  });
});

describe('authoritative revenue layer', () => {
  it('defaults to disabled unless AUTHORITATIVE_REVENUE_LAYER=YES', () => {
    assert.equal(isAuthoritativeRevenueLayerEnabled(undefined), false);
    assert.equal(isAuthoritativeRevenueLayerEnabled('NO'), false);
    assert.equal(isAuthoritativeRevenueLayerEnabled('yes'), false);
    assert.equal(isAuthoritativeRevenueLayerEnabled('YES'), true);
  });

  it('does not expose a revenue map layer; unknown ids fall back to clientes', () => {
    assert.equal(MAP_LAYER_REGISTRY.some((layer) => layer.id === 'ingresos'), false);
    assert.equal(resolveMapLayer('ingresos'), 'clientes');
  });
});
