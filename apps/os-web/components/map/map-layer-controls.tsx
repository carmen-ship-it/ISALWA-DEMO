'use client';

import { Chip, StatusPill } from '@isalwa/ui';
import { MAP_LAYER_REGISTRY, type MapLayerId } from '@/lib/map/layers';

type MapLayerControlsProps = {
  activeLayer: MapLayerId;
  onChange: (layer: MapLayerId) => void;
};

export function MapLayerControls({ activeLayer, onChange }: MapLayerControlsProps) {
  const availableLayers = MAP_LAYER_REGISTRY.filter((l) => l.truthClass === 'available');
  const futureLayers = MAP_LAYER_REGISTRY.filter((l) => l.truthClass !== 'available');

  return (
    <div className="space-y-2" role="group" aria-label="Capas del mapa">
      <div className="flex flex-wrap gap-1.5">
        {availableLayers.map((layer) => {
          const active = activeLayer === layer.id;
          return (
            <Chip
              key={layer.id}
              active={active}
              aria-pressed={active}
              title={layer.note}
              onClick={() => onChange(layer.id)}
            >
              {layer.label}
            </Chip>
          );
        })}
        <div className="hidden sm:contents">
          {futureLayers.map((layer) => (
            <Chip
              key={layer.id}
              active={false}
              disabled
              aria-pressed={false}
              title={layer.note}
            >
              {layer.label}
              <span className="ml-1 text-[10px] font-normal opacity-70">
                {layer.truthClass === 'manual' ? 'manual' : 'próx.'}
              </span>
            </Chip>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--isalwa-slate)] sm:hidden">
        +{futureLayers.length} capas futuras (próximamente)
      </p>
      <div className="hidden flex-wrap gap-2 sm:flex">
        <StatusPill tone="info">Clientes · disponible</StatusPill>
        <StatusPill tone="info">Oportunidades / cotizaciones / pedidos · por registro</StatusPill>
        <StatusPill tone="info">Atención · disponible</StatusPill>
      </div>
      <p className="hidden text-xs leading-relaxed text-[var(--isalwa-slate)] sm:block">
        Las capas filtran clientes con registros canónicos. No inventan pines ni geografía.
      </p>
    </div>
  );
}
