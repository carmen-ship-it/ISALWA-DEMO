import Link from 'next/link';
import { StatusPill } from '@isalwa/ui';
import type { MapCustomerRow } from '@/lib/map/build-view-model';
import { partyHref } from '@/lib/party/navigation';

type MapQuickViewCompactProps = {
  row: MapCustomerRow;
  ownerLabel: string | null;
  onCloseHref: string;
};

/**
 * Compact geographic quick view — summary facts only.
 * Does not load a full Cliente 360 drawer body; opens ficha for depth.
 */
export function MapQuickViewCompact({ row, ownerLabel, onCloseHref }: MapQuickViewCompactProps) {
  const locationTone = row.hasCoordinates ? 'info' : row.hasProvenance ? 'manual' : 'warning';
  const locationLabel = row.hasCoordinates
    ? 'Coordenadas registradas'
    : row.hasProvenance
      ? 'Solo enlace de procedencia'
      : 'Sin ubicación en mapa';

  return (
    <aside
      className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4 shadow-[var(--isalwa-shadow-lift)]"
      aria-label="Vista rápida del mapa"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--isalwa-slate)]">Vista rápida</p>
          <h3 className="mt-1 truncate font-[family-name:var(--isalwa-font-display)] text-lg italic text-[var(--isalwa-kiln)]">
            {row.displayName}
          </h3>
        </div>
        <Link
          href={onCloseHref}
          className="shrink-0 text-xs font-medium text-[var(--isalwa-slate)] hover:text-[var(--isalwa-kiln)] hover:underline"
        >
          Cerrar
        </Link>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-[var(--isalwa-slate)]">Responsable</dt>
          <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{ownerLabel ?? 'Sin responsable asignado'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--isalwa-slate)]">Teléfono</dt>
          <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{row.primaryPhone ?? 'Sin teléfono'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--isalwa-slate)]">Ubicación</dt>
          <dd className="mt-1">
            <StatusPill tone={locationTone}>{locationLabel}</StatusPill>
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]">
        Atención, oportunidades y pedidos se abren en la ficha. Aquí no se inventan pines ni capas
        comerciales.
      </p>

      <nav className="mt-4 flex flex-col items-start gap-2 border-t border-[var(--isalwa-mist)] pt-3">
        <Link
          href={partyHref(row.partyId)}
          className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        >
          Abrir Cliente 360
        </Link>
      </nav>
    </aside>
  );
}
