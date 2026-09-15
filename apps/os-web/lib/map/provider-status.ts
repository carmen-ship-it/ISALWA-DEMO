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
      label: 'Lienzo en espera',
      detail:
        'Hay un token de mapa en el entorno, pero el lienzo no se conecta solo. La mesa de ubicación sigue con cobertura y lista — sin comprar ni activar un proveedor en silencio.',
      engine: 'mapbox',
      tokenPresent: true,
    };
  }

  if (provider === 'mapbox' && !token) {
    return {
      kind: 'unavailable',
      label: 'Lienzo en espera',
      detail:
        'Se pidió Mapbox sin token público. Se usa la lista honesta. No se inventan coordenadas ni se compra un plan.',
      engine: null,
      tokenPresent: false,
    };
  }

  if (provider === 'mock') {
    return {
      kind: 'mock_unwired',
      label: 'Lienzo en espera',
      detail:
        'El motor mock (MapLibre) existe en el contrato de proveedores, pero os-web no carga el lienzo todavía. Cobertura y lista muestran solo hechos ya registrados.',
      engine: 'maplibre',
      tokenPresent: false,
    };
  }

  return {
    kind: 'unavailable',
    label: 'Lienzo en espera',
    detail:
      'El mapa de teselas se conectará cuando haya una decisión explícita de proveedor. Hasta entonces esta mesa es intencional: cobertura, lista y ficha — sin coordenadas inventadas ni mapa de calor.',
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
