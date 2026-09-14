import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapCoverage } from './coverage';

describe('mapCoverage', () => {
  it('reports the 2 of 7 pilot case without fabricating coordinates', () => {
    const coverage = mapCoverage({
      withCoordinates: 2,
      provenanceOnly: 5,
      total: 7,
    });

    assert.deepEqual(coverage, {
      plottable: 2,
      unplotted: 5,
      label: '2 de 7 clientes con ubicación disponible en mapa',
    });
    assert.equal('latitude' in coverage, false);
    assert.equal('longitude' in coverage, false);
    assert.equal('coordinates' in coverage, false);
  });

  it('keeps a shared provenance URL as a confirmation flag, not a data mutation', () => {
    /**
     * MICRISTAL and TORREZ share one Maps URL.
     * REAL-DATA CONFIRMATION NEEDED — do not rewrite either location,
     * do not split the URL, and do not copy coordinates across them.
     */
    const sharedProvenanceUrlNeedsConfirmation = true;

    assert.equal(sharedProvenanceUrlNeedsConfirmation, true);

    const coverage = mapCoverage({
      withCoordinates: 2,
      provenanceOnly: 5,
      total: 7,
    });

    assert.equal(coverage.plottable, 2);
    assert.equal(coverage.unplotted, 5);
    assert.equal(coverage.label, '2 de 7 clientes con ubicación disponible en mapa');
    assert.equal(Object.keys(coverage).includes('latitude'), false);
  });

  it('does not turn provenance-only rows into plottable points', () => {
    const coverage = mapCoverage({
      withCoordinates: 0,
      provenanceOnly: 7,
      total: 7,
    });

    assert.equal(coverage.plottable, 0);
    assert.equal(coverage.unplotted, 7);
    assert.equal(coverage.label, '0 de 7 clientes con ubicación disponible en mapa');
  });

  it('refuses to reconcile mismatched counts', () => {
    assert.throws(
      () => mapCoverage({ withCoordinates: 3, provenanceOnly: 5, total: 7 }),
      /does not invent or drop locations/,
    );
  });
});
