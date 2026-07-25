import type { MapProvider, MapViewConfig } from './types';
import { SANTA_CRUZ_CENTER, SANTA_CRUZ_MAX_BOUNDS } from './types';

/**
 * Mock map provider — production-grade vector basemap without Mapbox credentials.
 * Uses MapLibre + a calm Positron-style basemap (no Google defaults, no bright pins).
 */
export class MockMapProvider implements MapProvider {
  readonly info = { name: 'mock-map-view', mode: 'mock' as const };

  getViewConfig(): MapViewConfig {
    return {
      engine: 'maplibre',
      // Carto Positron GL — soft greys; paint overrides in UI push porcelain/kiln
      styleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      defaultCenter: { ...SANTA_CRUZ_CENTER },
      defaultZoom: 11.2,
      minZoom: 9,
      maxZoom: 17,
      maxBounds: SANTA_CRUZ_MAX_BOUNDS,
      attribution: '© OpenStreetMap · © CARTO · ISALWA Territorio',
      enabledLayers: [],
    };
  }
}
