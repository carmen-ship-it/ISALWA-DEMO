/**
 * Revenue is not an authoritative map layer until explicitly enabled by ops.
 * Default: NO — presentation must never label commercial amounts as ingresos.
 */

export function isAuthoritativeRevenueLayerEnabled(
  envValue: string | null | undefined = process.env.AUTHORITATIVE_REVENUE_LAYER,
): boolean {
  return envValue?.trim() === 'YES';
}

export const AUTHORITATIVE_REVENUE_LAYER_NOTE =
  'Capa de ingresos desactivada. No hay libro mayor ni ingresos oficiales en el mapa.';
