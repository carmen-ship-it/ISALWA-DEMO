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
    note: 'Próximamente. No se colorea el mapa con trabajo pendiente todavía.',
  },
  {
    id: 'oportunidades',
    label: 'Oportunidades',
    truthClass: 'future',
    note: 'Próximamente. Una oportunidad no crea un pin.',
  },
  {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    truthClass: 'future',
    note: 'Próximamente. El valor cotizado no es ingreso ni geografía.',
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    truthClass: 'future',
    note: 'Próximamente. Un pedido no coloca al cliente en el mapa.',
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
    note: 'Manual / futuro. No hay capa de cobranza conectada.',
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
