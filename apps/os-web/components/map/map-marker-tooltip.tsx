'use client';

import { StatusPill } from '@isalwa/ui';
import type { MapHoverSnapshot } from '@/lib/map/hover-model';

type MapMarkerTooltipProps = {
  snapshot: MapHoverSnapshot | null;
  x: number;
  y: number;
  visible: boolean;
};

/**
 * Marker hover — client, responsible, commercial counts/values, next attention, status.
 * Never labels amounts as revenue.
 */
export function MapMarkerTooltip({ snapshot, x, y, visible }: MapMarkerTooltipProps) {
  if (!visible || !snapshot) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 w-[240px] -translate-x-1/2 -translate-y-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2.5 text-xs shadow-[var(--isalwa-shadow-lift)]"
      style={{ left: x, top: y - 10 }}
      role="tooltip"
      data-map-hover-label={snapshot.clientName}
      data-map-hover-party={snapshot.partyId}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium leading-snug text-[var(--isalwa-kiln)]">
          {snapshot.clientName}
        </p>
        <StatusPill tone={snapshot.statusTone} className="shrink-0">
          {snapshot.statusLabel}
        </StatusPill>
      </div>
      <dl className="mt-2 space-y-1 text-[var(--isalwa-slate)]">
        <div className="flex justify-between gap-2">
          <dt>Responsable</dt>
          <dd className="truncate text-right text-[var(--isalwa-kiln)]">
            {snapshot.responsible ?? 'Sin asignar'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Oportunidades</dt>
          <dd className="text-[var(--isalwa-kiln)]">{snapshot.opportunityCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Valor cotizado</dt>
          <dd className="text-[var(--isalwa-kiln)]">{snapshot.quotedValueLabel ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Pedidos</dt>
          <dd className="text-[var(--isalwa-kiln)]">{snapshot.orderCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Valor de pedidos</dt>
          <dd className="text-[var(--isalwa-kiln)]">{snapshot.orderValueLabel ?? '—'}</dd>
        </div>
        {snapshot.nextAttention ? (
          <div className="flex justify-between gap-2 border-t border-[var(--isalwa-mist)] pt-1">
            <dt>Próxima atención</dt>
            <dd className="max-w-[55%] truncate text-right text-[var(--isalwa-tint-amber-ink)]">
              {snapshot.nextAttention}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
