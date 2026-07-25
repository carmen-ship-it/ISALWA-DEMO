import { MapboxMapProvider } from './mapbox-map-provider';
import { MockMapProvider } from './mock-map-provider';
import type { MapProvider } from './types';

export type CreateMapProviderInput = {
  /** `mapbox` | `mock` (default mock) */
  provider?: string;
  /** Mapbox public token — required when provider=mapbox */
  mapboxToken?: string;
};

/**
 * Factory for the Territory GIS canvas.
 * Prefer Mapbox when token + provider=mapbox; otherwise Mock (MapLibre vector).
 */
export function createMapProvider(input: CreateMapProviderInput = {}): MapProvider {
  const name = (input.provider ?? 'mock').toLowerCase();
  if (name === 'mapbox') {
    const token = input.mapboxToken?.trim();
    if (!token) {
      // Soft fallthrough — never crash the OS surface
      return new MockMapProvider();
    }
    return new MapboxMapProvider({ accessToken: token });
  }
  return new MockMapProvider();
}

export type { MapProvider, MapViewConfig, MapEngine, TerritoryLayerId } from './types';
export { SANTA_CRUZ_CENTER, SANTA_CRUZ_MAX_BOUNDS } from './types';
export { MockMapProvider } from './mock-map-provider';
export { MapboxMapProvider } from './mapbox-map-provider';
