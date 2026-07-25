/**
 * Extension points for future Territory Intelligence (Mission 15 §5).
 * Mission 16 does NOT implement these — only reserves the contract.
 */

import type { TerritoryLayerId } from '@isalwa/providers';

export type TerritoryExtensionHooks = {
  /** Visit routes / day path */
  onRequestRoutes?: () => void;
  /** Coverage heatmaps */
  onRequestCoverage?: () => void;
  /** Silent territories */
  onRequestSilent?: () => void;
  /** Collections density */
  onRequestCollectionsDensity?: () => void;
  /** Advisor workload */
  onRequestWorkload?: () => void;
  /** Travel suggestions */
  onRequestTravel?: () => void;
};

export const TERRITORY_LAYER_REGISTRY: Record<
  TerritoryLayerId,
  { label: string; status: 'reserved' }
> = {
  routes: { label: 'Rutas de visita', status: 'reserved' },
  coverage: { label: 'Cobertura', status: 'reserved' },
  silent: { label: 'Territorios en silencio', status: 'reserved' },
  'collections-density': { label: 'Densidad de cobranza', status: 'reserved' },
  workload: { label: 'Carga del asesor', status: 'reserved' },
  travel: { label: 'Sugerencias de recorrido', status: 'reserved' },
};

/** Always empty in Mission 16 — wire layers here in later missions */
export function activeTerritoryLayers(): TerritoryLayerId[] {
  return [];
}
