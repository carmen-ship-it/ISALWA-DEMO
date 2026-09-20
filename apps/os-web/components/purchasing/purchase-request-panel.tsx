'use client';

import Link from 'next/link';
import {
  ActionBar,
  Button,
  EmptyState,
  OperatingRow,
  PageSection,
  SearchField,
  Skeleton,
  StatusPill,
} from '@isalwa/ui';
import { ServiceUnavailableState } from '@/components/states/app-states';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import {
  COMPRAS_COPY,
  type ComprasQueueItem,
  type ComprasQueueState,
} from '@/lib/purchasing/queue';
import { PURCHASE_REQUEST_STATUS_LABELS, type PurchaseRequestStatus } from '@isalwa/os-contracts';

/**
 * Mounted on /compras. A purchase request is not inventory and does not prove there is no stock.
 * Action queue, not a table of records to edit.
 */

const STATUS_FILTERS: Array<{ value: ''; label: string } | { value: PurchaseRequestStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'solicitado', label: PURCHASE_REQUEST_STATUS_LABELS.solicitado },
  { value: 'cotizandose', label: PURCHASE_REQUEST_STATUS_LABELS.cotizandose },
  { value: 'pedido_preparandose', label: PURCHASE_REQUEST_STATUS_LABELS.pedido_preparandose },
  { value: 'entregado', label: PURCHASE_REQUEST_STATUS_LABELS.entregado },
  { value: 'cancelled', label: PURCHASE_REQUEST_STATUS_LABELS.cancelled },
];

type PurchaseRequestPanelProps = {
  state: ComprasQueueState;
  items?: ComprasQueueItem[];
  count?: number;
  buyerSuggestions?: string[];
  query?: string | null;
  statusFilter?: string | null;
  onAdvance?: (id: string, status: string) => void;
  onStop?: (id: string) => void;
};

function statusTone(
  status: ComprasQueueItem['status'],
): 'in_progress' | 'pending' | 'completed' | 'cancelled' | 'open' {
  if (status === 'cotizandose' || status === 'pedido_preparandose') return 'pending';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'entregado') return 'completed';
  return 'open'; // solicitado → soft teal (registrado / abierto)
}

export function PurchaseRequestPanel({
  state,
  items = [],
  count = 0,
  buyerSuggestions = [],
  query = null,
  statusFilter = null,
  onAdvance,
  onStop,
}: PurchaseRequestPanelProps) {
  if (state === 'permission') {
    return (
      <OpsDeskSurface data-compras-status="denied" role="alert" data-owner-review-state="not-authorized">
        <EmptyState
          title={COMPRAS_COPY.permissionTitle}
          description={COMPRAS_COPY.permissionDescription}
        />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {COMPRAS_COPY.boundary}
        </p>
      </OpsDeskSurface>
    );
  }

  return (
    <OpsDeskSurface>
      <PageSection card className="p-6 md:p-8" aria-label={COMPRAS_COPY.title}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="manual">No es inventario</StatusPill>
        <StatusPill tone="neutral">No prueba falta de stock</StatusPill>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Revise los pedidos que requieren atención de Compras. Las órdenes de compra aún no se generan en ISALWA.
      </p>
      <div className="mt-8">{renderState(state, items, count, buyerSuggestions, query, statusFilter, onAdvance, onStop)}</div>
    </PageSection>
    </OpsDeskSurface>
  );
}

function renderState(
  state: ComprasQueueState,
  items: ComprasQueueItem[],
  count: number,
  buyerSuggestions: string[],
  query: string | null,
  statusFilter: string | null,
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
    return <ServiceUnavailableState />;
  }
  return (
    <QueueList
      items={items}
      count={count}
      buyerSuggestions={buyerSuggestions}
      query={query}
      statusFilter={statusFilter}
      onAdvance={onAdvance}
      onStop={onStop}
    />
  );
}

function QueueList({
  items,
  count,
  buyerSuggestions,
  query,
  statusFilter,
  onAdvance,
  onStop,
}: {
  items: ComprasQueueItem[];
  count: number;
  buyerSuggestions: string[];
  query: string | null;
  statusFilter: string | null;
  onAdvance?: (id: string, status: string) => void;
  onStop?: (id: string) => void;
}) {
  const filterActive = Boolean(query?.trim() || statusFilter);
  const clearHref = '/compras';

  return (
    <div>
      <ActionBar
        sticky
        className="mb-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]"
      >
        <form method="get" action="/compras" className="flex w-full flex-wrap items-end gap-3" role="search">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="compras-search" className="isalwa-section-label">
              Buscar
            </label>
            <SearchField
              id="compras-search"
              name="q"
              defaultValue={query ?? ''}
              placeholder="Ítem, área o quien pide"
              className="mt-1.5"
            />
          </div>
          <div className="min-w-[10rem]">
            <label htmlFor="compras-status" className="isalwa-section-label">
              Estado
            </label>
            <select
              id="compras-status"
              name="estado"
              defaultValue={statusFilter ?? ''}
              className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          {filterActive ? (
            <Link href={clearHref} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
              Quitar filtros
            </Link>
          ) : null}
        </form>
      </ActionBar>
      <p className="text-sm text-[var(--isalwa-kiln)]">
        {COMPRAS_COPY.countLabel} · {count}
        {filterActive ? ` · mostrando ${items.length}` : null}
      </p>
      {buyerSuggestions.length > 0 ? (
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
          Compradora en esta empresa · {buyerSuggestions.join(', ')}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div
          className="mt-6"
          data-owner-review-state={filterActive ? 'no-data' : 'v1-flow-to-validate'}
        >
          <EmptyState
            title={filterActive ? 'Ningún pedido coincide con el filtro' : COMPRAS_COPY.emptyTitle}
            description={
              filterActive
                ? 'Pruebe otro estado o quite los filtros. La cola no inventa pedidos.'
                : COMPRAS_COPY.emptyDescription
            }
            example={
              filterActive
                ? 'Quitar filtros muestra toda la cola de esta empresa.'
                : 'Las órdenes de compra aún no se generan en ISALWA.'
            }
          />
        </div>
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
