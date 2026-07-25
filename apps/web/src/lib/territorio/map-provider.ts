import { createMapProvider, type MapProvider, type MapViewConfig } from '@isalwa/providers';

/**
 * Browser map provider — never import mapbox-gl / maplibre here.
 * Token from NEXT_PUBLIC_MAPBOX_TOKEN; provider from NEXT_PUBLIC_MAPS_PROVIDER or MAPS_PROVIDER.
 */
export function getClientMapProvider(): MapProvider {
  const provider =
    process.env.NEXT_PUBLIC_MAPS_PROVIDER ??
    process.env.MAPS_PROVIDER ??
    'mock';
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN;
  return createMapProvider({ provider, mapboxToken });
}

export function getClientMapViewConfig(): MapViewConfig {
  return getClientMapProvider().getViewConfig();
}
