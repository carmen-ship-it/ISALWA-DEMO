/**
 * Map tile provider status for os-web.
 * Never imports mapbox-gl / maplibre. Never purchases or connects silently.
 */

import { MapboxMapProvider, type MapViewConfig } from '@isalwa/providers';

export type MapProviderStatus =
  | {
      kind: 'unavailable';
      label: string;
      detail: string;
      engine: null;
      tokenPresent: false;
    }
  | {
      kind: 'live';
      label: string;
      detail: string;
      engine: 'mapbox';
      tokenPresent: true;
    }
  | {
      kind: 'mock_unwired';
      label: string;
      detail: string;
      engine: 'maplibre';
      tokenPresent: false;
    };

export type MapProviderEnv = {
  mapsProvider?: string | null;
  mapboxToken?: string | null;
};

export function isLiveMapProvider(
  status: MapProviderStatus,
): status is Extract<MapProviderStatus, { kind: 'live' }> {
  return status.kind === 'live';
}

/**
 * Resolve whether the map desk should render a live canvas or honest fallback.
 */
export function resolveMapProviderStatus(env: MapProviderEnv = readMapProviderEnv()): MapProviderStatus {
  const provider = (env.mapsProvider ?? '').trim().toLowerCase();
  const token = (env.mapboxToken ?? '').trim();

  if (provider === 'mapbox' && token) {
    return {
      kind: 'live',
      label: 'Mapa activo',
      detail:
        'Solo se trazan clientes con coordenadas confirmadas. Un enlace de mapas no genera un pin.',
      engine: 'mapbox',
      tokenPresent: true,
    };
  }

  if (provider === 'mapbox' && !token) {
    return {
      kind: 'unavailable',
      label: 'Vista geográfica en preparación',
      detail:
        'La información de ubicación ya está organizada. La visualización completa sobre mapa podrá activarse cuando se conecte el proveedor geográfico.',
      engine: null,
      tokenPresent: false,
    };
  }

  if (provider === 'mock') {
    return {
      kind: 'mock_unwired',
      label: 'Vista geográfica en preparación',
      detail:
        'La información de ubicación ya está organizada. La visualización completa sobre mapa podrá activarse cuando se conecte el proveedor geográfico.',
      engine: 'maplibre',
      tokenPresent: false,
    };
  }

  return {
    kind: 'unavailable',
    label: 'Vista geográfica en preparación',
    detail:
      'La información de ubicación ya está organizada. La visualización completa sobre mapa podrá activarse cuando se conecte el proveedor geográfico.',
    engine: null,
    tokenPresent: false,
  };
}

/** MapboxMapProvider view config when live; null when fallback applies. */
export function resolveMapViewConfig(env: MapProviderEnv = readMapProviderEnv()): MapViewConfig | null {
  const status = resolveMapProviderStatus(env);
  if (!isLiveMapProvider(status)) return null;
  const token = (env.mapboxToken ?? '').trim();
  if (!token) return null;
  return new MapboxMapProvider({ accessToken: token }).getViewConfig();
}

export function readMapProviderEnv(): MapProviderEnv {
  return {
    mapsProvider: process.env.NEXT_PUBLIC_MAPS_PROVIDER ?? process.env.MAPS_PROVIDER ?? null,
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN ?? null,
  };
}
