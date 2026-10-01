'use client';

import { Chip } from '@isalwa/ui';
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
      </div>
      {futureLayers.length > 0 ? (
        <details className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)] px-3 py-2">
          <summary className="cursor-pointer list-none text-xs font-medium text-[var(--isalwa-slate)] [&::-webkit-details-marker]:hidden">
            Próximamente · {futureLayers.length} capa{futureLayers.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-[var(--isalwa-slate)]">
            {futureLayers.map((layer) => (
              <li key={layer.id}>
                <span className="font-medium text-[var(--isalwa-kiln)]">{layer.label}</span>
                {layer.note ? ` — ${layer.note}` : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="text-xs leading-relaxed text-[var(--isalwa-slate)]">
        Las capas activas filtran clientes con registros canónicos. No inventan pines ni geografía.
      </p>
    </div>
  );
}
