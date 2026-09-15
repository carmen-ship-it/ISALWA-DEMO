'use client';

import { Chip, StatusPill } from '@isalwa/ui';
import { MAP_LAYER_REGISTRY, type MapLayerId } from '@/lib/map/layers';

type MapLayerControlsProps = {
  activeLayer: MapLayerId;
  onChange: (layer: MapLayerId) => void;
};

export function MapLayerControls({ activeLayer, onChange }: MapLayerControlsProps) {
  return (
    <div className="space-y-2" role="group" aria-label="Capas del mapa">
      <div className="flex flex-wrap gap-1.5">
        {MAP_LAYER_REGISTRY.map((layer) => {
          const enabled = layer.truthClass === 'available';
          const active = activeLayer === layer.id;
          return (
            <Chip
              key={layer.id}
              active={active}
              disabled={!enabled}
              aria-pressed={active}
              title={layer.note}
              onClick={() => {
                if (enabled) onChange(layer.id);
              }}
            >
              {layer.label}
              {!enabled ? (
                <span className="ml-1 text-[10px] font-normal opacity-70">
                  {layer.truthClass === 'manual' ? 'manual' : 'próx.'}
                </span>
              ) : null}
            </Chip>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="info">Clientes · disponible</StatusPill>
        <StatusPill tone="manual">Otras capas · futuro o manual</StatusPill>
      </div>
      <p className="text-xs leading-relaxed text-[var(--isalwa-slate)]">
        Solo la capa Clientes filtra la lista. Las demás quedan marcadas para no inventar geografía,
        calor ni territorios.
      </p>
    </div>
  );
}
