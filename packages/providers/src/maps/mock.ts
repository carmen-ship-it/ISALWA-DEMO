import type { MapsProvider } from '../types/index';

/** Santa Cruz–ish fallback for demo geocoding without credentials. */
const KNOWN: Record<string, { lat: number; lng: number; label: string }> = {
  porongo: { lat: -17.8333, lng: -63.3167, label: 'Porongo, Santa Cruz, Bolivia' },
  'santa cruz': {
    lat: -17.7833,
    lng: -63.1821,
    label: 'Santa Cruz de la Sierra, Bolivia',
  },
  warnes: { lat: -17.5, lng: -63.1667, label: 'Warnes, Santa Cruz, Bolivia' },
  montero: { lat: -17.3333, lng: -63.25, label: 'Montero, Santa Cruz, Bolivia' },
};

export class MockMapsProvider implements MapsProvider {
  readonly info = { name: 'mock-maps', mode: 'mock' as const };

  async geocode(query: string) {
    const key = query.trim().toLowerCase();
    for (const [k, v] of Object.entries(KNOWN)) {
      if (key.includes(k)) return v;
    }
    return {
      lat: -17.7833,
      lng: -63.1821,
      label: `${query} (aproximado · mock)`,
    };
  }

  async reverseGeocode(lat: number, lng: number) {
    return { label: `${lat.toFixed(5)}, ${lng.toFixed(5)} · Santa Cruz (mock)` };
  }

  async health() {
    return 'up' as const;
  }
}
