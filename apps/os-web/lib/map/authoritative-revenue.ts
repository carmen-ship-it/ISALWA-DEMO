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
  'ISALWA no muestra montos contables en el mapa; solo lectura comercial registrada.';
