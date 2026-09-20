/**
 * Display-only map bubble sizing from recorded commercial values / attention counts.
 * Does not invent amounts. Does not mutate underlying data.
 */

export const MAP_MARKER_RADIUS_MIN = 8;
export const MAP_MARKER_RADIUS_MAX = 30;
/** Fixed radius for Clientes layer — no commercial value implied. */
export const MAP_MARKER_RADIUS_CLIENT = 9;
/** Selected markers gain a small bump without escaping the scale. */
export const MAP_MARKER_SELECTED_BUMP = 2;

export type MapMarkerScaleMode = 'fixed' | 'value' | 'attention';

/**
 * Sqrt normalization across currently visible positive values.
 * Zero / missing → minimum. Single positive value → mid-scale.
 */
export function scaleMarkerRadius(
  value: number | null | undefined,
  visibleValues: readonly number[],
  min = MAP_MARKER_RADIUS_MIN,
  max = MAP_MARKER_RADIUS_MAX,
): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return min;
  const positives = visibleValues.filter((v) => Number.isFinite(v) && v > 0);
  if (positives.length === 0) return min;
  if (positives.length === 1) return Math.round((min + max) / 2);

  const maxVal = Math.max(...positives);
  if (maxVal <= 0) return min;
  const t = Math.sqrt(value / maxVal);
  const clamped = Math.min(1, Math.max(0, t));
  return Math.round(min + clamped * (max - min));
}

/** Attention intensity 0–1 from count relative to visible max count. */
export function attentionIntensity(
  count: number,
  visibleCounts: readonly number[],
): number {
  if (count <= 0) return 0;
  const max = Math.max(0, ...visibleCounts.filter((c) => c > 0));
  if (max <= 0) return 0.35;
  return Math.min(1, count / max);
}

export function attentionCircleColor(intensity: number): string {
  if (intensity <= 0) return '#3d5c58';
  if (intensity < 0.34) return '#b8872e'; // amber
  if (intensity < 0.67) return '#a66a2a';
  return '#a63d36'; // danger red
}

export const MAP_LAYER_LEGEND: Record<
  string,
  { sizeLine: string | null; colorLine: string | null }
> = {
  clientes: {
    sizeLine: null,
    colorLine: null,
  },
  oportunidades: {
    sizeLine: 'Tamaño = monto estimado registrado',
    colorLine: null,
  },
  cotizaciones: {
    sizeLine: 'Tamaño = valor cotizado registrado',
    colorLine: null,
  },
  pedidos: {
    sizeLine: 'Tamaño = valor de pedidos registrado',
    colorLine: null,
  },
  atencion: {
    sizeLine: 'Tamaño = cantidad de atención registrada',
    colorLine: 'Color = nivel de atención',
  },
};

export const MAP_VALUE_DISCLAIMER_SHORT =
  'Los valores provienen de registros comerciales de ISALWA y no representan ingresos contables.';
