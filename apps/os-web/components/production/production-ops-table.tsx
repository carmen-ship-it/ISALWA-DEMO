'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button, EmptyState, FeedbackNote, ListRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
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
};

/**
 * Production work table — Pedido / Client / requested / last update / responsible / date / next action.
 */
export function ProductionOpsTable({ rows, actorMemberId, canMutate }: ProductionOpsTableProps) {
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
    <PageSection card className="p-6 md:p-8" aria-label="Cola de producción por pedido">
      <SectionHeader
        kicker="Producción"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos en contexto
          </h2>
        }
      />
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Hechos de pedido y solicitudes de actualización. No se inventa un estado de fábrica.
      </p>
      {feedback ? (
        <div className="mt-4">
          <FeedbackNote tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Sin pedidos abiertos"
            description="Cuando exista un pedido en esta empresa, aparecerá aquí para anotar o solicitar actualización."
          />
        </div>
      ) : (
        <ul className="mt-6">
          {rows.map((row) => {
            const href = orderHref(row.pedido.partyId, row.pedido.orderId);
            const busy = pending && pendingId === row.pedido.orderId;
            return (
              <ListRow key={row.pedido.orderId} as="li" className="items-start gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={href}
                      className="text-sm font-medium text-[var(--isalwa-kiln)] hover:text-[var(--isalwa-glaze)]"
                    >
                      {row.pedido.orderLabel}
                    </Link>
                    {row.openProductionReviewWorkId ? (
                      <StatusPill tone="warning">Revisión de producción</StatusPill>
                    ) : null}
                    {row.openUpdate ? (
                      <StatusPill tone="warning">{PRODUCTION_UPDATE_REQUEST_COPY.requested}</StatusPill>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {row.pedido.customerLabel}
                    {' · '}
                    {row.requestedAction}
                    {' · '}
                    {row.lastUpdateLabel}
                  </p>
                  <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
                    Responsable: {row.responsibleLabel}
                    {' · '}
                    {row.dateLabel}
                    {' · '}
                    Siguiente: {row.nextAction}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {row.openProductionReviewWorkId ? (
                    <Link
                      href={workItemHref(row.openProductionReviewWorkId)}
                      className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                    >
                      Ver revisión
                    </Link>
                  ) : null}
                  {row.openUpdate ? (
                    <Link
                      href={workItemHref(row.openUpdate.workItemId)}
                      className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                    >
                      Ver trabajo
                    </Link>
                  ) : canMutate && actorMemberId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => requestUpdate(row)}
                    >
                      {busy ? 'Solicitando…' : PRODUCTION_UPDATE_REQUEST_COPY.action}
                    </Button>
                  ) : null}
                </div>
              </ListRow>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}
