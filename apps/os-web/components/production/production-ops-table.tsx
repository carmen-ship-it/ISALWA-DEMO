'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button, EmptyState, FeedbackNote, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import '@/components/commercial/commercial-surfaces.css';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { orderHref } from '@/lib/commercial/navigation';
import {
  PRODUCTION_UPDATE_REQUEST_COPY,
  type ProductionUpdateOpenRequest,
} from '@/lib/production/update-request-work';
import { requestProductionUpdateAction } from '@/lib/production/update-request-actions';
import { workItemHref } from '@/lib/work/navigation';
import type { PostSalePedidoOption } from '@/lib/postsale/pedido-context';

export type ProductionOpsRow = {
  pedido: PostSalePedidoOption;
  requestedAction: string;
  lastUpdateLabel: string;
  responsibleLabel: string;
  dateLabel: string;
  nextAction: string;
  openUpdate: ProductionUpdateOpenRequest | null;
  /** Open order-prep production review Work when present. */
  openProductionReviewWorkId: string | null;
  productionOwnerMemberId: string | null;
};

type ProductionOpsTableProps = {
  rows: readonly ProductionOpsRow[];
  actorMemberId: string | null;
  canMutate: boolean;
  /** True empty queue (no pedidos loaded). */
  trueEmpty?: boolean;
  /** Search active with zero matches. */
  zeroMatch?: boolean;
  searchQuery?: string | null;
};

const DESKTOP_GRID =
  'md:grid-cols-[minmax(6.5rem,1.05fr)_minmax(8rem,1.25fr)_minmax(6rem,1fr)_minmax(7rem,0.95fr)_minmax(6rem,0.9fr)_minmax(7.5rem,auto)_minmax(10.5rem,auto)]';

const HEADER_COLUMNS = [
  { id: 'pedido', label: 'Pedido', className: 'min-w-0' },
  { id: 'client', label: 'Cliente', className: 'min-w-0' },
  { id: 'revision', label: 'Revisión', className: 'min-w-0' },
  { id: 'updated', label: 'Última actualización', className: 'min-w-0' },
  { id: 'owner', label: 'Responsable', className: 'min-w-0' },
  { id: 'status', label: 'Estado', className: 'justify-self-end text-right' },
  { id: 'action', label: 'Acciones', className: 'justify-self-end text-right' },
];

/**
 * Production work table — Pedido / Cliente / Revisión / Última actualización / Responsable / Estado / Acción.
 */
export function ProductionOpsTable({ rows, actorMemberId, canMutate, trueEmpty = false, zeroMatch = false, searchQuery = null }: ProductionOpsTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; title: string; detail?: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function requestUpdate(row: ProductionOpsRow) {
    if (!actorMemberId || !canMutate || pending) return;
    setFeedback(null);
    setPendingId(row.pedido.orderId);
    startTransition(async () => {
      const result = await requestProductionUpdateAction({
        orderId: row.pedido.orderId,
        partyId: row.pedido.partyId,
        actorMemberId,
        productionOwnerMemberId: row.productionOwnerMemberId,
        orderLabel: row.pedido.orderLabel,
      });
      setPendingId(null);
      if (!result.ok) {
        setFeedback({ tone: 'error', title: result.error });
        return;
      }
      setFeedback({
        tone: 'success',
        title: result.alreadyOpen
          ? PRODUCTION_UPDATE_REQUEST_COPY.requested
          : 'Actualización solicitada en Trabajo.',
        detail: result.needsCanonicalAssignee
          ? PRODUCTION_UPDATE_REQUEST_COPY.noAssignee
          : undefined,
      });
    });
  }

  return (
    <OpsDeskSurface className="mb-4">
      <PageSection className="p-0 shadow-none" data-section-tone="active" aria-label="Cola de producción por pedido">
        <SectionHeader
          kicker="Producción"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
              Pedidos en contexto
            </h2>
          }
        />
        {feedback ? (
          <div className="mt-4">
            <FeedbackNote tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
          </div>
        ) : null}
        {rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={
                zeroMatch
                  ? 'Ningún pedido coincide'
                  : trueEmpty || !searchQuery
                    ? 'Sin pedidos abiertos'
                    : 'Sin pedidos abiertos'
              }
              description={
                zeroMatch
                  ? `No hay pedidos que coincidan con «${searchQuery}». Pruebe otro Pedido o cliente.`
                  : 'Los pedidos abiertos aparecen aquí. La revisión de producción se solicita desde el pedido; no se crea sola.'
              }
            />
          </div>
        ) : (
          <div className="commercial-operating-list mt-4 overflow-x-auto rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white" data-production-ops-table="">
            <OperatingScanListHeader columns={HEADER_COLUMNS} className={DESKTOP_GRID} />
            <ul className="m-0 list-none p-0">
              {rows.map((row) => {
                const href = orderHref(row.pedido.partyId, row.pedido.orderId);
                const busy = pending && pendingId === row.pedido.orderId;
                const statusPills = (
                  <>
                    {row.openProductionReviewWorkId ? (
                      <StatusPill tone="warning" icon="none">
                        Revisión de producción
                      </StatusPill>
                    ) : null}
                    {row.openUpdate ? (
                      <StatusPill tone="warning" icon="none">
                        {PRODUCTION_UPDATE_REQUEST_COPY.requested}
                      </StatusPill>
                    ) : null}
                  </>
                );
                const viewAction =
                  row.openProductionReviewWorkId ? (
                    <Link
                      href={workItemHref(row.openProductionReviewWorkId)}
                      data-production-action="ver-revision"
                      className="isalwa-t-fast inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                    >
                      Ver revisión
                    </Link>
                  ) : row.openUpdate ? (
                    <Link
                      href={workItemHref(row.openUpdate.workItemId)}
                      data-production-action="ver-solicitud"
                      className="isalwa-t-fast inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                    >
                      Ver solicitud
                    </Link>
                  ) : null;

                const requestAction =
                  !viewAction && canMutate && actorMemberId ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      data-production-action="solicitar-actualizacion"
                      disabled={busy}
                      onClick={() => requestUpdate(row)}
                    >
                      {busy ? 'Solicitando…' : PRODUCTION_UPDATE_REQUEST_COPY.action}
                    </Button>
                  ) : null;

                return (
                  <li key={row.pedido.orderId}>
                    <OperatingScanRow
                      href={href}
                      title={row.pedido.orderLabel}
                      desktopGridClassName={DESKTOP_GRID}
                      fields={[
                        {
                          id: 'client',
                          label: 'Cliente',
                          value: row.pedido.customerLabel,
                        },
                        {
                          id: 'revision',
                          label: 'Revisión',
                          value: row.requestedAction || '—',
                        },
                        {
                          id: 'updated',
                          label: 'Última actualización',
                          value: row.lastUpdateLabel || '—',
                          hideOnMobile: true,
                        },
                        {
                          id: 'owner',
                          label: 'Responsable',
                          value: row.responsibleLabel || '—',
                          hideOnMobile: true,
                        },
                      ]}
                      status={
                        <div className="flex min-h-8 min-w-[7.5rem] flex-wrap items-center justify-end gap-1.5">
                          {statusPills}
                        </div>
                      }
                      actionLabel="Ver pedido"
                      primaryAction={requestAction}
                      secondaryActions={viewAction}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </PageSection>
    </OpsDeskSurface>
  );
}
