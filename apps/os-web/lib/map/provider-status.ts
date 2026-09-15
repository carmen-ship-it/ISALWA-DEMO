/**
 * Map tile provider status for os-web.
 * Never imports mapbox-gl / maplibre. Never purchases or connects silently.
 * A configured token is reported honestly; it does not turn the canvas on by itself.
 */

export type MapProviderStatus =
  | {
      kind: 'unavailable';
      label: string;
      detail: string;
      engine: null;
      tokenPresent: false;
    }
  | {
      kind: 'token_present_unwired';
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

/**
 * Resolve whether a tile canvas could be wired.
 * OS web does not load a GL SDK in this pass — status drives honest fallback UI only.
 */
export function resolveMapProviderStatus(env: MapProviderEnv = readMapProviderEnv()): MapProviderStatus {
  const provider = (env.mapsProvider ?? '').trim().toLowerCase();
  const token = (env.mapboxToken ?? '').trim();

  if (provider === 'mapbox' && token) {
    return {
      kind: 'token_present_unwired',
      label: 'Vista geográfica en preparación',
      detail:
        'La información de ubicación ya está organizada. La visualización completa sobre mapa podrá activarse cuando se conecte el proveedor geográfico.',
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

export function readMapProviderEnv(): MapProviderEnv {
  return {
    mapsProvider: process.env.NEXT_PUBLIC_MAPS_PROVIDER ?? process.env.MAPS_PROVIDER ?? null,
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN ?? null,
  };
}
