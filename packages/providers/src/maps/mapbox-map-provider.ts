import type { MapProvider, MapViewConfig } from './types';
import { SANTA_CRUZ_CENTER, SANTA_CRUZ_MAX_BOUNDS } from './types';

export type MapboxMapProviderOptions = {
  accessToken: string;
  /** Optional custom style; defaults to Mapbox Light (calm, premium) */
  styleUrl?: string;
};

/**
 * Mapbox vector map provider.
 * UI must not import mapbox-gl — only consume getViewConfig().
 */
export class MapboxMapProvider implements MapProvider {
  readonly info = { name: 'mapbox-map-view', mode: 'live' as const };

  constructor(private readonly options: MapboxMapProviderOptions) {
    if (!options.accessToken?.trim()) {
      throw new Error('MapboxMapProvider requires accessToken');
    }
  }

  getViewConfig(): MapViewConfig {
    return {
      engine: 'mapbox',
      styleUrl: this.options.styleUrl ?? 'mapbox://styles/mapbox/light-v11',
      accessToken: this.options.accessToken,
      defaultCenter: { ...SANTA_CRUZ_CENTER },
      defaultZoom: 11.2,
      minZoom: 9,
      maxZoom: 18,
      maxBounds: SANTA_CRUZ_MAX_BOUNDS,
      attribution: '© Mapbox · © OpenStreetMap · ISALWA Territorio',
      enabledLayers: [],
    };
  }
}
