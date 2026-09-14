'use client';

import { Button, EmptyState, OperatingRow, PageSection, SearchField, Skeleton, StatusPill } from '@isalwa/ui';
import { AccessDeniedState, ServiceUnavailableState } from '@/components/states/app-states';
import {
  COMPRAS_COPY,
  type ComprasQueueItem,
  type ComprasQueueState,
} from '@/lib/purchasing/queue';

/**
 * Mounted on /compras. A purchase request is not inventory and does not prove there is no stock.
 * Action queue, not a table of records to edit.
 */

const HAPPY_PATH = ['Solicitado', 'Cotizándose', 'Pedido y Preparándose', 'Entregado'] as const;

type PurchaseRequestPanelProps = {
  state: ComprasQueueState;
  items?: ComprasQueueItem[];
  count?: number;
  buyerSuggestions?: string[];
  onAdvance?: (id: string, status: string) => void;
  onStop?: (id: string) => void;
};

function statusTone(status: ComprasQueueItem['status']): 'info' | 'warning' | 'manual' | 'neutral' {
  if (status === 'cotizandose' || status === 'pedido_preparandose') return 'warning';
  if (status === 'cancelled') return 'neutral';
  if (status === 'entregado') return 'manual';
  return 'info';
}

export function PurchaseRequestPanel({
  state,
  items = [],
  count = 0,
  buyerSuggestions = [],
  onAdvance,
  onStop,
}: PurchaseRequestPanelProps) {
  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label={COMPRAS_COPY.title}>
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Un pedido de compra no prueba que no haya stock. No es inventario y no genera una recompra automática.
      </p>
      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Pasos de la compra">
        {HAPPY_PATH.map((label) => (
          <li key={label}>
            <StatusPill tone="info">{label}</StatusPill>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
        Cancelado no es un paso. Solo detiene un pedido equivocado.
      </p>
      <div className="mt-8">{renderState(state, items, count, buyerSuggestions, onAdvance, onStop)}</div>
    </PageSection>
  );
}

function renderState(
  state: ComprasQueueState,
  items: ComprasQueueItem[],
  count: number,
  buyerSuggestions: string[],
  onAdvance?: (id: string, status: string) => void,
  onStop?: (id: string) => void,
) {
  if (state === 'loading') {
    return (
      <div aria-live="polite" aria-busy="true">
        <p className="text-sm text-[var(--isalwa-slate)]">{COMPRAS_COPY.loading}</p>
        <Skeleton className="mt-4" h={72} rounded="panel" />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <ServiceUnavailableState />
    );
  }
  if (state === 'permission') {
    return <AccessDeniedState />;
  }
  return (
    <QueueList
      items={items}
      count={count}
      buyerSuggestions={buyerSuggestions}
      onAdvance={onAdvance}
      onStop={onStop}
    />
  );
}

function QueueList({
  items,
  count,
  buyerSuggestions,
  onAdvance,
  onStop,
}: {
  items: ComprasQueueItem[];
  count: number;
  buyerSuggestions: string[];
  onAdvance?: (id: string, status: string) => void;
  onStop?: (id: string) => void;
}) {
  return (
    <div>
      <form method="get" action="/compras" className="mb-4 max-w-md" role="search">
        <label htmlFor="compras-search" className="isalwa-section-label">
          Buscar en esta empresa
        </label>
        <SearchField id="compras-search" name="q" placeholder="Ítem, área o quien pide" className="mt-1.5" />
      </form>
      <p className="text-sm text-[var(--isalwa-kiln)]">
        {COMPRAS_COPY.countLabel} · {count}
      </p>
      {buyerSuggestions.length > 0 ? (
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
          Compradora en esta empresa · {buyerSuggestions.join(', ')}
        </p>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={COMPRAS_COPY.emptyTitle}
          description={COMPRAS_COPY.emptyDescription}
        />
      ) : (
        <ul className="mt-4" aria-label={COMPRAS_COPY.title}>
          {items.map((item) => (
            <li key={item.id}>
              <QueueRow item={item} onAdvance={onAdvance} onStop={onStop} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QueueRow({
  item,
  onAdvance,
  onStop,
}: {
  item: ComprasQueueItem;
  onAdvance?: (id: string, status: string) => void;
  onStop?: (id: string) => void;
}) {
  const meta = [
    `${COMPRAS_COPY.age} ${item.ageLabel}`,
    `${COMPRAS_COPY.area} ${item.requestingArea}`,
    `${COMPRAS_COPY.requester} ${item.requestedByLabel}`,
    item.quantityLabel ? `${COMPRAS_COPY.quantity} ${item.quantityLabel}` : null,
    item.linkedContext ? `${COMPRAS_COPY.linked} ${item.linkedContext}` : null,
    `${COMPRAS_COPY.buyer} ${item.buyerLabel ?? COMPRAS_COPY.buyerMissing}`,
    item.nextAction ? `${COMPRAS_COPY.nextAction} ${item.nextAction}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <article className="border-b border-[color-mix(in_srgb,var(--isalwa-mist)_80%,white)] last:border-b-0">
      <OperatingRow
        subject={item.description}
        meta={meta}
        status={<StatusPill tone={statusTone(item.status)}>{item.statusLabel}</StatusPill>}
        actions={
          item.nextStatus && onAdvance ? (
            <Button type="button" size="sm" onClick={() => onAdvance(item.id, item.nextStatus!)}>
              {item.nextAction}
            </Button>
          ) : null
        }
      />
      {item.notes.length > 0 ? (
        <ul className="space-y-1 px-3 pb-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {item.notes.map((note) => (
            <li key={note.id}>
              {COMPRAS_COPY.notes} · {note.body} · {note.actorLabel}
              {note.evidenceReference ? ` · ${COMPRAS_COPY.evidence} ${note.evidenceReference}` : null}
            </li>
          ))}
        </ul>
      ) : null}
      {item.canStop && onStop ? (
        <div className="px-3 pb-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => onStop(item.id)}>
            {COMPRAS_COPY.stop}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
