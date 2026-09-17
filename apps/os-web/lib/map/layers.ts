/**
 * Map layer registry — presentation only.
 * Only layers with truthClass "available" may drive list filters.
 * Future/manual layers stay labeled; they never invent geography.
 */

export type MapLayerTruthClass = 'available' | 'future' | 'manual';

export type MapLayerId =
  | 'clientes'
  | 'atencion'
  | 'oportunidades'
  | 'cotizaciones'
  | 'pedidos'
  | 'ingresos'
  | 'equipo'
  | 'cobranza'
  | 'despacho'
  | 'stock';

export type MapLayerDefinition = {
  id: MapLayerId;
  label: string;
  truthClass: MapLayerTruthClass;
  /** Short Spanish note when not available. */
  note: string;
};

export const MAP_LAYER_REGISTRY: readonly MapLayerDefinition[] = [
  {
    id: 'clientes',
    label: 'Clientes',
    truthClass: 'available',
    note: 'Solo clientes visibles con hechos de ubicación ya cargados.',
  },
  {
    id: 'atencion',
    label: 'Atención',
    truthClass: 'future',
    note: 'Próximamente. La atención de Inicio no filtra el mapa por cliente todavía.',
  },
  {
    id: 'oportunidades',
    label: 'Oportunidades',
    truthClass: 'available',
    note: 'Clientes con oportunidad abierta en registros canónicos. No inventa pines.',
  },
  {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    truthClass: 'available',
    note: 'Clientes con cotización canónica. El valor cotizado no es ingreso.',
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    truthClass: 'available',
    note: 'Clientes con pedido canónico. El valor del pedido no es cobranza.',
  },
  {
    id: 'ingresos',
    label: 'Ingresos',
    truthClass: 'future',
    note: 'Desactivado. AUTHORITATIVE_REVENUE_LAYER=NO — no hay ingresos oficiales en el mapa.',
  },
  {
    id: 'equipo',
    label: 'Equipo',
    truthClass: 'future',
    note: 'Próximamente. El responsable se ve en la ficha, no como capa aún.',
  },
  {
    id: 'cobranza',
    label: 'Cobranza',
    truthClass: 'manual',
    note: 'Manual / futuro. No hay capa de cobranza ni ingresos oficiales.',
  },
  {
    id: 'despacho',
    label: 'Despacho',
    truthClass: 'manual',
    note: 'Manual / futuro. No hay capa de despacho conectada.',
  },
  {
    id: 'stock',
    label: 'Stock',
    truthClass: 'manual',
    note: 'Manual / futuro. No hay capa de stock en el mapa.',
  },
] as const;

export const DEFAULT_MAP_LAYER: MapLayerId = 'clientes';

export function availableMapLayers(): MapLayerDefinition[] {
  return MAP_LAYER_REGISTRY.filter((layer) => layer.truthClass === 'available');
}

export function resolveMapLayer(id: string | null | undefined): MapLayerId {
  const match = MAP_LAYER_REGISTRY.find((layer) => layer.id === id);
  if (!match || match.truthClass !== 'available') return DEFAULT_MAP_LAYER;
  return match.id;
}
