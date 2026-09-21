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
    note: 'Clientes con ubicación ya cargada en ISALWA.',
  },
  {
    id: 'atencion',
    label: 'Atención',
    truthClass: 'available',
    note: 'Clientes con trabajo vencido o ítem de atención activo.',
  },
  {
    id: 'oportunidades',
    label: 'Oportunidades',
    truthClass: 'available',
    note: 'Clientes con una oportunidad abierta.',
  },
  {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    truthClass: 'available',
    note: 'Clientes con una cotización registrada.',
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    truthClass: 'available',
    note: 'Clientes con un pedido registrado.',
  },
  {
    id: 'equipo',
    label: 'Equipo',
    truthClass: 'future',
    note: 'Próximamente. El responsable se ve en la ficha del cliente.',
  },
  {
    id: 'cobranza',
    label: 'Cobranza',
    truthClass: 'manual',
    note: 'Manual / futuro. Sin capa de cobranza conectada al mapa.',
  },
  {
    id: 'despacho',
    label: 'Despacho',
    truthClass: 'manual',
    note: 'Manual / futuro. Sin capa de despacho conectada.',
  },
  {
    id: 'stock',
    label: 'Stock',
    truthClass: 'manual',
    note: 'Manual / futuro. Sin capa de stock en el mapa.',
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
