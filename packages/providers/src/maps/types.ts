/**
 * Map view configuration — vendor-agnostic.
 * UI components depend on MapViewConfig / MapProvider, never on Mapbox or MapLibre APIs directly.
 */

import type { ProviderInfo } from '../types/index';

/** Future Territory layers — extension points only (Mission 16). Do not implement yet. */
export type TerritoryLayerId =
  | 'routes'
  | 'coverage'
  | 'silent'
  | 'collections-density'
  | 'workload'
  | 'travel';

export type MapEngine = 'mapbox' | 'maplibre';

export type MapViewConfig = {
  engine: MapEngine;
  /** Style URL or style JSON URI */
  styleUrl: string;
  /** Required for Mapbox engine; unused for most MapLibre free styles */
  accessToken?: string;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  /** Santa Cruz metro framing for fitBounds fallbacks */
  maxBounds?: [[number, number], [number, number]];
  attribution: string;
  /** Declared extension hooks — always empty in Mission 16 */
  enabledLayers: TerritoryLayerId[];
};

/**
 * Client/server map view provider.
 * Geocoding remains on MapsProvider (types/index.ts); this is the GIS canvas contract.
 */
export interface MapProvider {
  readonly info: ProviderInfo;
  getViewConfig(): MapViewConfig;
}

/** Santa Cruz de la Sierra — commercial operating center */
export const SANTA_CRUZ_CENTER = { lat: -17.7833, lng: -63.1821 } as const;

/** Soft metro bounds (lng/lat) — Equipetrol / Warnes / Montero / La Guardia / Plan Tres Mil corridor */
export const SANTA_CRUZ_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-63.55, -18.05],
  [-62.85, -17.15],
];
