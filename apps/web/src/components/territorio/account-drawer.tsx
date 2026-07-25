'use client';

import Link from 'next/link';
import { StatusPill } from '@isalwa/ui';
import {
  MARKER_COLORS,
  markerHealth,
  type TerritoryPoint,
} from '@/lib/territorio/points';

function creditTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ok') return 'success';
  if (status === 'watch') return 'warning';
  if (status === 'hold' || status === 'blocked') return 'danger';
  return 'neutral';
}

function creditLabel(status: string) {
  if (status === 'ok') return 'Crédito OK';
  if (status === 'watch') return 'Vigilar';
  if (status === 'hold') return 'Bloqueado';
  return status;
}

export function AccountDrawer({
  point,
  onClose,
}: {
  point: TerritoryPoint | null;
  onClose: () => void;
}) {
  const open = Boolean(point);
  const health = point ? markerHealth(point) : 'healthy';
  const accent = MARKER_COLORS[health];

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar ficha"
        className={`fixed inset-0 z-[60] bg-[color-mix(in_srgb,var(--isalwa-kiln)_35%,transparent)] transition-opacity duration-[var(--isalwa-motion-base)] ease-[var(--isalwa-ease-out)] md:bg-transparent md:pointer-events-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={point ? `Cliente ${point.name}` : 'Ficha de cliente'}
        className={`fixed top-0 right-0 z-[70] flex h-full w-[min(380px,100vw)] flex-col border-l border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-lift)] transition-transform duration-[var(--isalwa-motion-base)] ease-[var(--isalwa-ease-out)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-1 shrink-0" style={{ background: accent }} aria-hidden />
        <div className="flex items-start justify-between gap-3 border-b border-[var(--isalwa-mist)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--isalwa-glaze)] uppercase">
              Ficha territorial
            </p>
            <h2
              className="mt-1 truncate text-[clamp(1.15rem,2vw,1.35rem)] text-[var(--isalwa-kiln)]"
              style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic', fontWeight: 400 }}
            >
              {point?.name ?? '—'}
            </h2>
            {point ? (
              <p className="mt-1 font-[var(--isalwa-font-mono)] text-[11px] text-[var(--isalwa-slate)]">
                {point.code} · {point.territoryCode}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="isalwa-interactive min-h-10 min-w-10 rounded-[var(--isalwa-radius-control)] text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-porcelain)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {point ? (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="info">Seg. {point.segment}</StatusPill>
              <StatusPill tone={creditTone(point.creditStatus)}>
                {creditLabel(point.creditStatus)}
              </StatusPill>
              {point.code.startsWith('H-') ? <StatusPill tone="neutral">VIP</StatusPill> : null}
            </div>

            <dl className="grid gap-3 text-[var(--isalwa-text-sm)]">
              <div>
                <dt className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                  Asesor
                </dt>
                <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{point.ownerName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                  Score
                </dt>
                <dd className="mt-0.5 font-[var(--isalwa-font-mono)] text-[var(--isalwa-kiln)]">
                  {point.relationshipScore ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                  Última visita
                </dt>
                <dd className="mt-0.5 text-[var(--isalwa-kiln)]">
                  {point.lastVisitAt
                    ? new Date(point.lastVisitAt).toLocaleDateString('es-BO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Sin registro'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                  Coordenadas
                </dt>
                <dd className="mt-0.5 font-[var(--isalwa-font-mono)] text-[11px] text-[var(--isalwa-slate)]">
                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                </dd>
              </div>
            </dl>

            <div className="mt-auto flex flex-col gap-2 border-t border-[var(--isalwa-mist)] pt-4">
              <Link
                href={point.href}
                className="isalwa-interactive rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-glaze)] px-4 py-3 text-center text-[var(--isalwa-text-sm)] font-semibold text-white hover:bg-[var(--isalwa-glaze-deep)]"
              >
                Abrir dossier →
              </Link>
              <Link
                href={`/cierre?account=${point.accountId}`}
                className="isalwa-interactive rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-4 py-3 text-center text-[var(--isalwa-text-sm)] font-medium text-[var(--isalwa-kiln)]"
              >
                Cotizar
              </Link>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
