import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  locationHasCoordinates,
  normalizeProvenanceUrl,
  selectLocationProvenanceUrl,
  selectPrimaryPhone,
} from './party-operating-facts';

describe('party operating facts', () => {
  it('uses a stored phone and ignores an empty or inactive contact', () => {
    assert.equal(
      selectPrimaryPhone([
        { id: 'b', status: 'active', phone: '  77711122  ' },
        { id: 'a', status: 'active', phone: '70000000' },
        { id: 'c', status: 'inactive', phone: '111' },
      ]),
      '70000000',
    );
    assert.equal(selectPrimaryPhone([{ id: 'a', status: 'active', phone: '   ' }]), null);
  });

  it('treats coordinates as location and a Maps link as provenance only', () => {
    const provenance = {
      status: 'active',
      latitude: null,
      longitude: null,
      provenanceUrl: ' https://maps.example/shared ',
    };
    assert.equal(locationHasCoordinates(provenance), false);
    assert.equal(selectLocationProvenanceUrl([provenance]), 'https://maps.example/shared');
    assert.equal(
      locationHasCoordinates({
        status: 'active',
        latitude: -17.78,
        longitude: -63.18,
        provenanceUrl: null,
      }),
      true,
    );
    assert.equal(
      locationHasCoordinates({
        status: 'inactive',
        latitude: -17.78,
        longitude: -63.18,
        provenanceUrl: null,
      }),
      false,
    );
  });

  it('normalizes a shared provenance url without changing the stored value', () => {
    assert.equal(
      normalizeProvenanceUrl(' HTTPS://maps.example/Shared '),
      'https://maps.example/shared',
    );
    assert.equal(normalizeProvenanceUrl('  '), null);
  });
});
