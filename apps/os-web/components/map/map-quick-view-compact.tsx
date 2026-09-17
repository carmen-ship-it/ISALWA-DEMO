import Link from 'next/link';
import { StatusPill } from '@isalwa/ui';
import type { MapCustomerRow } from '@/lib/map/build-view-model';
import {
  MAP_COMMERCIAL_VALUE_DISCLAIMER,
  type MapPartyCommercialSnapshot,
} from '@/lib/map/commercial-lens';
import { pendingLocationCta } from '@/lib/map/pending-location';
import { partyHref } from '@/lib/party/navigation';

type MapQuickViewCompactProps = {
  row: MapCustomerRow;
  ownerLabel: string | null;
  onCloseHref: string;
  commercial?: MapPartyCommercialSnapshot | null;
  /** Drawer host supplies its own chrome; omit inline Cerrar. */
  variant?: 'inline' | 'drawer';
};

/**
 * Compact geographic + commercial quick view — summary facts only.
 * Opens Cliente 360 for depth. Never labels amounts as revenue.
 */
export function MapQuickViewCompact({
  row,
  ownerLabel,
  onCloseHref,
  commercial = null,
  variant = 'inline',
}: MapQuickViewCompactProps) {
  const locationTone = row.hasCoordinates ? 'info' : row.hasProvenance ? 'manual' : 'warning';
  const locationLabel = row.hasCoordinates
    ? 'Coordenadas registradas'
    : row.hasProvenance
      ? 'Ubicación registrada — coordenadas pendientes'
      : 'Sin ubicación registrada';
  const locationPending = pendingLocationCta(row);
  const isDrawer = variant === 'drawer';

  const shellClass = isDrawer
    ? 'space-y-4'
    : 'rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] p-4 shadow-[var(--isalwa-shadow-lift)]';

  return (
    <aside
      className={shellClass}
      aria-label="Vista rápida del mapa"
      data-map-quick-view={isDrawer ? 'drawer' : 'compact'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!isDrawer ? <p className="isalwa-kicker">Vista rápida</p> : null}
          <h3
            className={`truncate font-[family-name:var(--isalwa-font-display)] text-lg italic text-[var(--isalwa-kiln)] ${isDrawer ? '' : 'mt-1'}`}
          >
            {row.displayName}
          </h3>
        </div>
        {!isDrawer && onCloseHref ? (
          <Link
            href={onCloseHref}
            className="shrink-0 text-xs font-medium text-[var(--isalwa-slate)] hover:text-[var(--isalwa-kiln)] hover:underline"
          >
            Cerrar
          </Link>
        ) : null}
      </div>

      <dl className="mt-4 space-y-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white p-3 text-sm">
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
          {locationPending ? (
            <dd className="mt-2">
              <Link
                href={locationPending.href}
                className="inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-btn-secondary-border)] bg-[var(--isalwa-btn-secondary-bg)] px-3 text-xs font-medium text-[var(--isalwa-btn-secondary-fg)] hover:border-[var(--isalwa-btn-secondary-border-hover)] hover:bg-[var(--isalwa-btn-secondary-bg-hover)]"
                data-map-pending-location-cta={locationPending.tone}
              >
                {locationPending.label}
              </Link>
            </dd>
          ) : null}
        </div>
      </dl>

      {commercial ? (
        <dl
          className="mt-3 space-y-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white p-3 text-sm"
          data-map-commercial-snapshot="party"
        >
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs text-[var(--isalwa-slate)]">Oportunidades abiertas</dt>
            <dd className="font-medium text-[var(--isalwa-kiln)]">{commercial.opportunityCount}</dd>
          </div>
          {commercial.opportunityValueLabel ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-[var(--isalwa-slate)]">Valor de oportunidades</dt>
              <dd className="font-medium text-[var(--isalwa-kiln)]">{commercial.opportunityValueLabel}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs text-[var(--isalwa-slate)]">Cotizaciones</dt>
            <dd className="font-medium text-[var(--isalwa-kiln)]">{commercial.quoteCount}</dd>
          </div>
          {commercial.quotedValueLabel ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-[var(--isalwa-slate)]">Valor cotizado</dt>
              <dd className="font-medium text-[var(--isalwa-kiln)]">{commercial.quotedValueLabel}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs text-[var(--isalwa-slate)]">Pedidos</dt>
            <dd className="font-medium text-[var(--isalwa-kiln)]">{commercial.orderCount}</dd>
          </div>
          {commercial.orderValueLabel ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-[var(--isalwa-slate)]">Valor de pedidos</dt>
              <dd className="font-medium text-[var(--isalwa-kiln)]">{commercial.orderValueLabel}</dd>
            </div>
          ) : null}
          <p className="pt-1 text-xs leading-relaxed text-[var(--isalwa-slate)]">
            {MAP_COMMERCIAL_VALUE_DISCLAIMER}
          </p>
        </dl>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]">
          Contexto comercial se carga desde registros canónicos cuando está disponible. Aquí no se
          inventan pines ni ingresos.
        </p>
      )}

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
