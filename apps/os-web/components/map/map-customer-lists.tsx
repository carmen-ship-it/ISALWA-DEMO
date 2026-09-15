import Link from 'next/link';
import { StatusPill } from '@isalwa/ui';
import type { MapCustomerRow } from '@/lib/map/build-view-model';
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
  return (
    <li
      className={`border-t border-[var(--isalwa-mist)] first:border-t-0 ${
        selected ? 'bg-[var(--isalwa-porcelain)]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <Link
            href={href}
            className="text-sm font-medium text-[var(--isalwa-kiln)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            aria-current={selected ? 'true' : undefined}
          >
            {row.displayName}
          </Link>
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
            {[owner ? `Resp. ${owner}` : null, row.primaryPhone, row.hasCoordinates ? 'Con coordenadas' : null]
              .filter(Boolean)
              .join(' · ') || 'Sin teléfono ni responsable en esta lectura'}
          </p>
        </div>
        <Link
          href={partyHref(row.partyId)}
          className="shrink-0 text-xs font-medium text-[var(--isalwa-glaze)] hover:underline"
        >
          Ficha
        </Link>
      </div>
    </li>
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
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
            Ningún cliente visible tiene coordenadas. No se inventan pines.
          </p>
        ) : (
          <ul className="mt-1">
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

      <section aria-label="Solo enlace de procedencia">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Solo enlace (sin coordenadas)</h2>
          <StatusPill tone="manual">{provenanceFiltered.length}</StatusPill>
        </div>
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
          Un enlace de Maps es procedencia. No coloca al cliente en el mapa y no se geocodifica.
        </p>
        {provenanceFiltered.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Nadie en esta lectura tiene solo un enlace.</p>
        ) : (
          <ul className="mt-1">
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
          <ul className="mt-1">
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
