import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { MapCustomerRow } from '@/lib/map/build-view-model';
import { pendingLocationCta } from '@/lib/map/pending-location';
import { panelHref, type ListQueryState } from '@/lib/lists/url-state';
import { partyHref } from '@/lib/party/navigation';

type MapCustomerListsProps = {
  plottable: readonly MapCustomerRow[];
  provenanceOnly: readonly MapCustomerRow[];
  noLocation: readonly MapCustomerRow[];
  selectedPartyId: string | null;
  listQuery: ListQueryState;
  memberLabels?: ReadonlyMap<string, string>;
  query: string;
};

function ownerLabel(
  row: MapCustomerRow,
  memberLabels?: ReadonlyMap<string, string>,
): string | null {
  if (!row.commercialOwnerMemberId) return null;
  return memberLabels?.get(row.commercialOwnerMemberId) ?? null;
}

function railFor(row: MapCustomerRow): string {
  if (row.hasCoordinates) return 'var(--isalwa-glaze)';
  if (row.hasProvenance) return 'color-mix(in srgb, var(--isalwa-kiln) 45%, var(--isalwa-mist))';
  return 'var(--isalwa-mist)';
}

function CustomerRow({
  row,
  selected,
  listQuery,
  memberLabels,
}: {
  row: MapCustomerRow;
  selected: boolean;
  listQuery: ListQueryState;
  memberLabels?: ReadonlyMap<string, string>;
}) {
  const owner = ownerLabel(row, memberLabels);
  const href = panelHref('/mapa', listQuery, `party:${row.partyId}`);
  const pendingCta = pendingLocationCta(row);
  return (
    <ListRow
      as="li"
      railColor={railFor(row)}
      className={
        selected
          ? 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,var(--isalwa-porcelain))]'
          : 'bg-transparent'
      }
    >
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={href}
            className="text-sm font-medium text-[var(--isalwa-kiln)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            aria-current={selected ? 'true' : undefined}
          >
            {row.displayName}
          </Link>
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
            {[
              owner ? `Resp. ${owner}` : null,
              row.primaryPhone,
              row.hasCoordinates ? 'Ubicación confirmada' : row.hasProvenance ? 'Ubicación por confirmar' : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Sin teléfono ni responsable en esta lectura'}
          </p>
          {pendingCta ? (
            <Link
              href={pendingCta.href}
              className="mt-1.5 inline-block text-xs font-medium text-[var(--isalwa-glaze)] hover:underline"
              data-map-pending-location-cta={pendingCta.tone}
            >
              {pendingCta.label}
            </Link>
          ) : null}
        </div>
        <Link
          href={partyHref(row.partyId)}
          className="shrink-0 text-xs font-medium text-[var(--isalwa-glaze)] hover:underline"
        >
          Ficha
        </Link>
      </div>
    </ListRow>
  );
}

function matchesQuery(row: MapCustomerRow, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return row.displayName.toLowerCase().includes(q) || (row.primaryPhone ?? '').toLowerCase().includes(q);
}

export function MapCustomerLists({
  plottable,
  provenanceOnly,
  noLocation,
  selectedPartyId,
  listQuery,
  memberLabels,
  query,
}: MapCustomerListsProps) {
  const plottableFiltered = plottable.filter((row) => matchesQuery(row, query));
  const provenanceFiltered = provenanceOnly.filter((row) => matchesQuery(row, query));
  const noLocationFiltered = noLocation.filter((row) => matchesQuery(row, query));

  return (
    <div className="space-y-6">
      <section aria-label="Disponibles en mapa">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Disponibles en mapa</h2>
          <StatusPill tone="info">{plottableFiltered.length}</StatusPill>
        </div>
        {plottableFiltered.length === 0 ? (
          <p className="mt-2 rounded-[var(--isalwa-radius-control)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_80%,white)] px-3 py-2.5 text-sm text-[var(--isalwa-slate)]">
            Ningún cliente visible tiene coordenadas. No se inventan pines.
          </p>
        ) : (
          <ul className="mt-2 overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white">
            {plottableFiltered.map((row) => (
              <CustomerRow
                key={row.partyId}
                row={row}
                selected={selectedPartyId === row.partyId}
                listQuery={listQuery}
                memberLabels={memberLabels}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Ubicación registrada — coordenadas pendientes">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Ubicación registrada — coordenadas pendientes</h2>
          <StatusPill tone="manual">{provenanceFiltered.length}</StatusPill>
        </div>
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
          Enlace de procedencia presente (e.g. Google Maps). No coloca al cliente en el mapa sin geocodificación.
        </p>
        {provenanceFiltered.length === 0 ? (
          <p className="mt-2 rounded-[var(--isalwa-radius-control)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_80%,white)] px-3 py-2.5 text-sm text-[var(--isalwa-slate)]">
            Nadie en esta lectura tiene solo un enlace.
          </p>
        ) : (
          <ul className="mt-2 overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white">
            {provenanceFiltered.map((row) => (
              <CustomerRow
                key={row.partyId}
                row={row}
                selected={selectedPartyId === row.partyId}
                listQuery={listQuery}
                memberLabels={memberLabels}
              />
            ))}
          </ul>
        )}
      </section>

      {noLocationFiltered.length > 0 ? (
        <section aria-label="Sin ubicación registrada">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Sin ubicación registrada</h2>
            <StatusPill tone="warning">{noLocationFiltered.length}</StatusPill>
          </div>
          <ul className="mt-2 overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white">
            {noLocationFiltered.map((row) => (
              <CustomerRow
                key={row.partyId}
                row={row}
                selected={selectedPartyId === row.partyId}
                listQuery={listQuery}
                memberLabels={memberLabels}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
