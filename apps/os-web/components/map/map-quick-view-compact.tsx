import Link from 'next/link';
import { Button, StatusPill } from '@isalwa/ui';
import { FreshnessLabel } from '@/components/freshness/freshness-label';
import { MapPendingLocationCard } from '@/components/map/map-pending-location-card';
import { ProcessStepIndicator } from '@/components/progress/process-step-indicator';
import { clienteSectionHref } from '@/lib/commercial/navigation';
import type { MapCustomerRow } from '@/lib/map/build-view-model';
import {
  MAP_COMMERCIAL_VALUE_DISCLAIMER,
  type MapPartyCommercialSnapshot,
} from '@/lib/map/commercial-lens';
import { pendingLocationCardCopy } from '@/lib/map/pending-location';
import { partyHref } from '@/lib/party/navigation';
import { resolveCommercialProcessSteps } from '@/lib/progress/process-steps';

type MapQuickViewCompactProps = {
  row: MapCustomerRow;
  ownerLabel: string | null;
  onCloseHref: string;
  commercial?: MapPartyCommercialSnapshot | null;
  /** Drawer host supplies its own chrome; omit inline Cerrar. */
  variant?: 'inline' | 'drawer';
  nextActionLabel?: string | null;
  issueCount?: number | null;
  lastUpdatedIso?: string | null;
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
  nextActionLabel = null,
  issueCount = null,
  lastUpdatedIso = null,
}: MapQuickViewCompactProps) {
  const locationPending = pendingLocationCardCopy(row);
  const isDrawer = variant === 'drawer';
  const followUpHref = clienteSectionHref(row.partyId, 'trabajo');
  const conversationStubHref = `/conversaciones?partyId=${encodeURIComponent(row.partyId)}`;
  const processSteps = resolveCommercialProcessSteps({
    hasClient: true,
    hasOpportunity: (commercial?.opportunityCount ?? 0) > 0,
    hasQuote: (commercial?.quoteCount ?? 0) > 0,
    hasOrder: (commercial?.orderCount ?? 0) > 0,
    hasDelivery: false,
  });

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
          <dt className="text-xs text-[var(--isalwa-slate)]">Contacto</dt>
          <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{row.primaryPhone ?? 'Sin teléfono'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--isalwa-slate)]">Ubicación</dt>
          <dd className="mt-1">
            {locationPending ? (
              <MapPendingLocationCard copy={locationPending} />
            ) : (
              <StatusPill tone="info">Ubicación confirmada</StatusPill>
            )}
          </dd>
        </div>
        {nextActionLabel ? (
          <div>
            <dt className="text-xs text-[var(--isalwa-slate)]">Próxima acción</dt>
            <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{nextActionLabel}</dd>
          </div>
        ) : null}
        {issueCount != null ? (
          <div>
            <dt className="text-xs text-[var(--isalwa-slate)]">Incidencias</dt>
            <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{issueCount}</dd>
          </div>
        ) : null}
        {lastUpdatedIso ? (
          <div>
            <dt className="text-xs text-[var(--isalwa-slate)]">Última actualización</dt>
            <dd className="mt-0.5">
              <FreshnessLabel lastUpdatedIso={lastUpdatedIso} />
            </dd>
          </div>
        ) : null}
      </dl>

      <ProcessStepIndicator
        kicker="Progreso comercial"
        title="Hechos registrados"
        steps={processSteps}
        className="mt-3 shadow-none"
      />

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

      <nav className="mt-4 flex flex-col gap-2 border-t border-[var(--isalwa-mist)] pt-3">
        <Link href={partyHref(row.partyId)} className="inline-flex">
          <Button type="button" variant="primary" size="sm">
            Ver Cliente360
          </Button>
        </Link>
        <Link href={followUpHref} className="inline-flex">
          <Button type="button" variant="secondary" size="sm">
            Programar seguimiento
          </Button>
        </Link>
        <Link
          href={conversationStubHref}
          className="inline-flex"
          data-map-conversation-stub="lane-c"
        >
          <Button type="button" variant="tertiary" size="sm">
            Registrar conversación
          </Button>
        </Link>
      </nav>
    </aside>
  );
}
