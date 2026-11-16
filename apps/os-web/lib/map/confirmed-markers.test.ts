import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { LocationView, PartyLocationsResponse } from '@/lib/party/types';
import { confirmedCoordinates, loadConfirmedMarkers, pickConfirmedCoordinates } from './confirmed-markers';

const loc = (over: Partial<LocationView>): LocationView =>
  ({ status: 'active', latitude: -17.78, longitude: -63.18, ...over }) as LocationView;
const response = (locations: LocationView[]): PartyLocationsResponse => ({ locations }) as PartyLocationsResponse;

describe('confirmed coordinates', () => {
  it('only an active location with finite, in-range coordinates is confirmed', () => {
    assert.deepEqual(confirmedCoordinates(loc({})), { lat: -17.78, lng: -63.18 });
    assert.equal(confirmedCoordinates(loc({ status: 'retired' as LocationView['status'] })), null);
    assert.equal(confirmedCoordinates(loc({ latitude: null as never })), null);
    assert.equal(confirmedCoordinates(loc({ latitude: Number.NaN })), null);
    assert.equal(confirmedCoordinates(loc({ latitude: 91 })), null);
    assert.equal(confirmedCoordinates(loc({ longitude: -181 })), null);
  });

  it('a latitude of exactly 0 is not mistaken for missing, but (0,0) is the "no value" default', () => {
    assert.deepEqual(confirmedCoordinates(loc({ latitude: 0, longitude: -63.18 })), { lat: 0, lng: -63.18 });
    assert.equal(confirmedCoordinates(loc({ latitude: 0, longitude: 0 })), null);
  });

  it('never falls back to a non-active location', () => {
    assert.equal(pickConfirmedCoordinates([loc({ status: 'retired' as LocationView['status'] })]), null);
    assert.deepEqual(
      pickConfirmedCoordinates([loc({ status: 'retired' as LocationView['status'] }), loc({ latitude: -16.5, longitude: -68.1 })]),
      { lat: -16.5, lng: -68.1 },
    );
  });
});

describe('loadConfirmedMarkers', () => {
  it('pins only customers with confirmed coordinates and counts failed reads instead of hiding them', async () => {
    const reads: string[] = [];
    const client = {
      listPartyLocations: async (partyId: string) => {
        reads.push(partyId);
        if (partyId === 'broken') throw new Error('boom');
        if (partyId === 'nocoords') return response([loc({ latitude: null as never })]);
        return response([loc({})]);
      },
    };
    const result = await loadConfirmedMarkers(
      client,
      [
        { partyId: 'a', displayName: 'A' },
        { partyId: 'nocoords', displayName: 'N' },
        { partyId: 'broken', displayName: 'B' },
        { partyId: 'c', displayName: 'C' },
      ],
      { concurrency: 2 },
    );
    assert.deepEqual(result.markers.map((m) => m.partyId), ['a', 'c']);
    assert.equal(result.failedCount, 1);
    assert.equal(reads.length, 4, 'one authorized read per visible customer; nothing else is read');
  });

  it('reads only the rows it is handed (the caller passes customer-search rows: same visibility as reads)', async () => {
    let calls = 0;
    const result = await loadConfirmedMarkers({ listPartyLocations: async () => (calls++, response([])) }, []);
    assert.equal(calls, 0);
    assert.deepEqual(result, { markers: [], failedCount: 0 });
  });

  it('bounds concurrency', async () => {
    let active = 0;
    let peak = 0;
    const client = {
      listPartyLocations: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 2));
        active -= 1;
        return response([]);
      },
    };
    await loadConfirmedMarkers(client, Array.from({ length: 10 }, (_, i) => ({ partyId: `p${i}`, displayName: 'x' })), { concurrency: 3 });
    assert.ok(peak <= 3, `peak ${peak}`);
  });
});

describe('map page honesty', () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

  it('plots only with a live provider and only customers from the scoped search; no invented geography', () => {
    const page = read('app/(app)/mapa/page.tsx');
    assert.match(page, /provider\.kind === 'live'/);
    assert.match(page, /loadConfirmedMarkers/);
    assert.doesNotMatch(page, /centroid|Math\.random|geocod|navigator\.geolocation/i);
    assert.doesNotMatch(read('components/map/map-experience.tsx'), /dataMode|data-demo|DEMO/);
  });

  it('is titled "Mapa de clientes" and lists unlocated customers as "Pendiente de ubicación"', async () => {
    const { t } = await import('@/lib/i18n/es');
    assert.equal(t('pages.mapa.title'), 'Mapa de clientes');
    assert.equal(t('pages.mapa.pendingLocation'), 'Pendiente de ubicación');
  });

  it('never states quote value as sales or confirmed funds', async () => {
    const { MAP_COMMERCIAL_VALUE_DISCLAIMER } = await import('./commercial-lens');
    assert.match(MAP_COMMERCIAL_VALUE_DISCLAIMER, /no representan ventas cerradas, ingresos contables ni fondos confirmados/);
  });
});
