import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAP_MARKER_RADIUS_MAX,
  MAP_MARKER_RADIUS_MIN,
  attentionCircleColor,
  attentionIntensity,
  scaleMarkerRadius,
} from './marker-scale';

describe('map marker scale', () => {
  it('uses minimum when value is missing or zero', () => {
    assert.equal(scaleMarkerRadius(null, [100, 200]), MAP_MARKER_RADIUS_MIN);
    assert.equal(scaleMarkerRadius(0, [100, 200]), MAP_MARKER_RADIUS_MIN);
  });

  it('scales with sqrt across visible values without inventing amounts', () => {
    const visible = [10_000, 90_000, 250_000];
    const small = scaleMarkerRadius(10_000, visible);
    const large = scaleMarkerRadius(250_000, visible);
    assert.ok(small >= MAP_MARKER_RADIUS_MIN);
    assert.ok(large <= MAP_MARKER_RADIUS_MAX);
    assert.ok(large > small);
  });

  it('maps attention intensity to restrained colors', () => {
    assert.equal(attentionIntensity(0, [1, 2]), 0);
    assert.ok(attentionIntensity(2, [1, 2]) >= 0.9);
    assert.match(attentionCircleColor(0.2), /^#/);
    assert.match(attentionCircleColor(0.9), /^#/);
  });
});
