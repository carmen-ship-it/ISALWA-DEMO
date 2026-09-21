'use client';

import { Chip } from '@isalwa/ui';
import { availableMapLayers, type MapLayerId } from '@/lib/map/layers';

type MapLayerControlsProps = {
  activeLayer: MapLayerId;
  onChange: (layer: MapLayerId) => void;
};

export function MapLayerControls({ activeLayer, onChange }: MapLayerControlsProps) {
  const layers = availableMapLayers();

  return (
    <div className="space-y-2" role="group" aria-label="Capas del mapa">
      <div className="flex flex-wrap gap-1.5">
        {layers.map((layer) => {
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
      </div>
    </div>
  );
}
