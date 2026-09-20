'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, StatusPill } from '@isalwa/ui';
import { ResolvePurchasingReviewForm } from '@/components/purchasing/resolve-purchasing-review-form';
import { orderHref } from '@/lib/commercial/navigation';
import { workItemHref } from '@/lib/work/navigation';

export type PendingSupplyReviewCardProps = {
  partyId: string;
  orderId: string;
  orderNumber: string;
  customerLabel: string;
  reviewTitle: string;
  workItemId: string;
  requesterMemberId: string;
  requesterLabel?: string | null;
};

/**
 * One pending purchasing review: readable summary first; resolve form on demand.
 */
export function PendingSupplyReviewCard({
  partyId,
  orderId,
  orderNumber,
  customerLabel,
  reviewTitle,
  workItemId,
  requesterMemberId,
  requesterLabel = null,
}: PendingSupplyReviewCardProps) {
  const [resolving, setResolving] = useState(false);
  const pedidoLabel = orderNumber.match(/^Pedido\b/i) ? orderNumber : `Pedido ${orderNumber}`;
  const href = orderHref(partyId, orderId);

  return (
    <article className="border-b border-[color-mix(in_srgb,var(--isalwa-mist)_80%,white)] p-4 last:border-b-0">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="isalwa-section-label">Pedido</dt>
          <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{pedidoLabel}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Cliente</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">{customerLabel}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Solicitud / Revisión</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">{reviewTitle || 'Revisión de abastecimiento'}</dd>
        </div>
        {requesterLabel ? (
          <div>
            <dt className="isalwa-section-label">Solicitado por</dt>
            <dd className="mt-1 text-[var(--isalwa-kiln)]">{requesterLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt className="isalwa-section-label">Estado</dt>
          <dd className="mt-1">
            <StatusPill tone="warning" icon="none">
              Pendiente
            </StatusPill>
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={href}
          className="isalwa-t-fast inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        >
          Ver pedido
        </Link>
        <Link
          href={workItemHref(workItemId)}
          className="isalwa-t-fast inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        >
          Ver revisión
        </Link>
        {!resolving ? (
          <Button type="button" size="sm" variant="primary" onClick={() => setResolving(true)}>
            Resolver revisión
          </Button>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={() => setResolving(false)}>
            Cancelar
          </Button>
        )}
      </div>

      {resolving ? (
        <div className="mt-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_50%,white)] p-4">
          <ResolvePurchasingReviewForm
            workItemId={workItemId}
            requesterMemberId={requesterMemberId}
            partyId={partyId}
            orderId={orderId}
            orderNumber={orderNumber}
          />
        </div>
      ) : null}
    </article>
  );
}
