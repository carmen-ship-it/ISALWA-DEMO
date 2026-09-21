import Link from 'next/link';
import {
  Button,
  PageContainer,
  PageSection,
  SearchField,
  SectionHeader,
  StatGroup,
  StatusPill,
} from '@isalwa/ui';
import '@/components/commercial/commercial-surfaces.css';
import { PurchaseRequestPanel } from '@/components/purchasing/purchase-request-panel';
import { PendingSupplyReviewCard } from '@/components/purchasing/pending-supply-review-card';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { OpsDeskInfoBanner } from '@/components/production/ops-desk-info-banner';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { PageHeader } from '@/components/shell/page-header';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { orderHref } from '@/lib/commercial/navigation';
import { COMPRAS_COPY } from '@/lib/purchasing/queue';
import { loadComprasQueue } from '@/lib/purchasing/load-queue';
import {
  loadComprasLinkedOrders,
  type ComprasLinkedOrder,
} from '@/lib/purchasing/load-linked-orders';
import { ListCapNotice } from '@/components/lists/list-cap-notice';
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { memberWithCargoLine, resolveMemberResponsibilityLabels } from '@/lib/work/member-resolver';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import {
  LIST_PAGE_SIZE,
  matchesOpsSearch,
  opsBoundedPageHrefs,
  opsListHref,
  parseListQuery,
  windowFilteredOpsCollection,
  type ListQueryState,
} from '@/lib/lists/ops-collection';

/** CROSS_LANE: add 'comprasFilter' to TOUR_TARGET in lib/walkthrough/targets.ts */
const COMPRAS_FILTER_TARGET = 'compras-filter';

type ComprasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LinkedOrderWithSupply = ComprasLinkedOrder & {
  supplyReview: {
    workItemId: string;
    title: string;
    requesterMemberId: string;
    /** Human label from member directory; null when lookup fails — never invent. */
    requesterLabel: string | null;
  } | null;
};

type ComprasListStates = {
  queue: ListQueryState;
  reviews: ListQueryState;
  linkable: ListQueryState;
  estado?: string;
};

type ComprasSurface = 'queue' | 'reviews' | 'linkable';

function one(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseComprasListStates(
  query: Record<string, string | string[] | undefined>,
): ComprasListStates {
  return {
    queue: parseListQuery(query),
    reviews: parseListQuery({ q: query.revisionQ, pagina: query.revisionPagina }),
    linkable: parseListQuery({ q: query.vincularQ, pagina: query.vincularPagina }),
    estado: one(query.estado) ?? undefined,
  };
}

function setParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}

function comprasSurfaceHref(
  canonicalHref: string,
  surface: ComprasSurface,
  states: ComprasListStates,
): string {
  const params = new URLSearchParams();
  setParam(params, 'q', states.queue.q);
  setParam(params, 'pagina', states.queue.pagina);
  setParam(params, 'estado', states.estado);
  setParam(params, 'revisionQ', states.reviews.q);
  setParam(params, 'revisionPagina', states.reviews.pagina);
  setParam(params, 'vincularQ', states.linkable.q);
  setParam(params, 'vincularPagina', states.linkable.pagina);

  const canonicalQuery = new URLSearchParams(canonicalHref.split('?')[1] ?? '');
  const keys =
    surface === 'queue'
      ? { q: 'q', pagina: 'pagina' }
      : surface === 'reviews'
        ? { q: 'revisionQ', pagina: 'revisionPagina' }
        : { q: 'vincularQ', pagina: 'vincularPagina' };
  params.delete(keys.q);
  params.delete(keys.pagina);
  setParam(params, keys.q, canonicalQuery.get('q') ?? undefined);
  setParam(params, keys.pagina, canonicalQuery.get('pagina') ?? undefined);

  const serialized = params.toString();
  const anchor =
    surface === 'queue'
      ? 'cola-compras'
      : surface === 'reviews'
        ? 'revisiones-pendientes'
        : 'pedidos-para-vincular';
  return `/compras${serialized ? `?${serialized}` : ''}#${anchor}`;
}

function boundedSurfaceLinks(
  surface: ComprasSurface,
  states: ComprasListStates,
  page: number,
  pageCount: number,
) {
  const canonical = opsBoundedPageHrefs('/compras', states[surface], page, pageCount);
  return {
    prevHref: canonical.prevHref ? comprasSurfaceHref(canonical.prevHref, surface, states) : null,
    nextHref: canonical.nextHref ? comprasSurfaceHref(canonical.nextHref, surface, states) : null,
  };
}

export default async function ComprasPage({ searchParams }: ComprasPageProps) {
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'compras')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Compras" />;
  }
  const query = await searchParams;
  const listStates = parseComprasListStates(query);
  const q = listStates.queue.q ?? null;
  const estado = listStates.estado ?? null;
  const [queue, linked] = await Promise.all([
    loadComprasQueue({ buyer: one(query.buyer), estado }),
    loadComprasLinkedWithSupply(),
  ]);
  const linkedOrders = linked.orders;
  const abastecimientoCount = linkedOrders.filter((row) => row.supplyReview).length;
  const queueWindow =
    queue.state === 'ready'
      ? windowFilteredOpsCollection(queue.items, {
          q: listStates.queue.q,
          pagina: listStates.queue.pagina,
          size: LIST_PAGE_SIZE,
          match: (item, search) =>
            matchesOpsSearch(search, [
              item.description,
              item.requestingArea,
              item.requestedByLabel,
              item.buyerLabel,
              item.linkedContext,
            ]),
        })
      : null;
  const queueLinks = queueWindow
    ? boundedSurfaceLinks('queue', listStates, queueWindow.page, queueWindow.pageCount)
    : { prevHref: null, nextHref: null };
  const clearQueueSearchHref = comprasSurfaceHref(
    opsListHref('/compras', {
      ...listStates.queue,
      q: undefined,
      pagina: undefined,
    }),
    'queue',
    listStates,
  );

  return (
    <PageContainer
      label={COMPRAS_COPY.title}
      data-tour={queue.state === 'ready' ? COMPRAS_FILTER_TARGET : undefined}
    >
      <PageHeader
        kicker={COMPRAS_COPY.kicker}
        title={queue.state === 'permission' ? COMPRAS_COPY.permissionTitle : COMPRAS_COPY.title}
        description={
          queue.state === 'permission'
            ? COMPRAS_COPY.permissionDescription
            : COMPRAS_COPY.description
        }
      />
      {queue.state === 'ready' || queue.state === 'permission' ? (
        <StatGroup
          className="mb-4"
          items={[
            {
              label: 'Revisiones de abastecimiento solicitadas',
              value: String(abastecimientoCount),
            },
            {
              label: 'Pendientes en cola',
              value: queue.state === 'ready' ? String(queue.count) : '—',
            },
            { label: 'Pedidos vinculados', value: String(linkedOrders.length) },
          ]}
        />
      ) : null}
      <OpsDeskInfoBanner
        columns={[
          { label: 'Cola', value: 'Pedidos que requieren atención de Compras.' },
          { label: 'Sin OC', value: 'No se genera orden de compra automática.' },
          { label: 'No inventario', value: 'No es inventario ni prueba falta de stock.' },
        ]}
      />
      {queue.state === 'ready' ? (
        <div id="cola-compras">
          <PurchaseRequestPanel
            state="ready"
            items={queueWindow?.items ?? []}
            count={queue.count}
            matchedCount={queueWindow?.matchedTotal ?? 0}
            pendingReviewCount={abastecimientoCount}
            buyerSuggestions={queue.buyerSuggestions}
            query={q}
            statusFilter={estado}
            clearSearchHref={clearQueueSearchHref}
            page={queueWindow?.page ?? 1}
            pageCount={queueWindow?.pageCount ?? 1}
            from={queueWindow?.from ?? 0}
            to={queueWindow?.to ?? 0}
            prevHref={queueLinks.prevHref}
            nextHref={queueLinks.nextHref}
          />
        </div>
      ) : (
        <PurchaseRequestPanel state={queue.state} pendingReviewCount={abastecimientoCount} />
      )}
      {queue.state === 'ready' || queue.state === 'permission' ? (
        <LinkedOrdersSection orders={linkedOrders} states={listStates} />
      ) : null}
      <ListCapNotice caps={linked.listCaps} />
    </PageContainer>
  );
}

async function loadComprasLinkedWithSupply(): Promise<{
  orders: LinkedOrderWithSupply[];
  listCaps: ListCap[];
}> {
  const listCaps: ListCap[] = [];
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return { orders: [], listCaps };
    const client = createOsApiClient(auth);
    const [orders, workPage] = await Promise.all([
      loadComprasLinkedOrders(listCaps),
      client.listWorkItems({ status: 'open', limit: 100 }).catch(() => ({ items: [] as const })),
    ]);
    pushListCap(listCaps, workPage, 100);
    const workItems = workPage.items ?? [];
    const requesterIds = orders
      .map((order) => {
        const open = findOpenOrderPrepReviews(workItems, order.orderId, order.partyId);
        const id =
          workItems.find((row) => row.workItemId === open.purchasing?.workItemId)
            ?.createdByMemberId ?? '';
        return id.trim();
      })
      .filter(Boolean);
    const responsibility = await resolveMemberResponsibilityLabels(client, requesterIds);
    return {
      listCaps,
      orders: orders.map((order) => {
        const open = findOpenOrderPrepReviews(workItems, order.orderId, order.partyId);
        const requesterMemberId =
          workItems
            .find((row) => row.workItemId === open.purchasing?.workItemId)
            ?.createdByMemberId?.trim() ?? '';
        const resolved = requesterMemberId ? responsibility.get(requesterMemberId) : undefined;
        // Only show when directory returned a real name (not the catch-all placeholder).
        const requesterLabel =
          resolved &&
          resolved.displayName &&
          resolved.displayName !== 'Miembro del equipo' &&
          presentHumanCopy(resolved.displayName)
            ? memberWithCargoLine(responsibility, requesterMemberId)
            : null;
        return {
          ...order,
          supplyReview: open.purchasing
            ? {
                workItemId: open.purchasing.workItemId,
                title: open.purchasing.title,
                requesterMemberId,
                requesterLabel,
              }
            : null,
        };
      }),
    };
  } catch {
    return { orders: [], listCaps };
  }
}

/**
 * Honest order picker surface. Purchase request SoR write remains FOUNDATION_GAP
 * (no hosted API command / prisma write registered). Operators link by orderId
 * instead of retyping pedido lines. No automatic PO.
 */
function LinkedOrdersSection({
  orders,
  states,
}: {
  orders: LinkedOrderWithSupply[];
  states: ComprasListStates;
}) {
  const pendingReviews = orders.filter((order) => order.supplyReview);
  const reviewsWindow = windowFilteredOpsCollection(pendingReviews, {
    q: states.reviews.q,
    pagina: states.reviews.pagina,
    size: LIST_PAGE_SIZE,
    match: (order, q) =>
      matchesOpsSearch(q, [
        order.orderNumber,
        order.customerLabel,
        order.supplyReview?.title,
        order.supplyReview?.workItemId,
      ]),
  });
  const linkableWindow = windowFilteredOpsCollection(orders, {
    q: states.linkable.q,
    pagina: states.linkable.pagina,
    size: LIST_PAGE_SIZE,
    match: (order, q) =>
      matchesOpsSearch(q, [
        order.orderNumber,
        order.customerLabel,
        order.status,
        order.supplyReview?.title,
      ]),
  });
  const reviewLinks = boundedSurfaceLinks(
    'reviews',
    states,
    reviewsWindow.page,
    reviewsWindow.pageCount,
  );
  const linkableLinks = boundedSurfaceLinks(
    'linkable',
    states,
    linkableWindow.page,
    linkableWindow.pageCount,
  );

  return (
    <>
      <PendingSupplyReviewsSection
        orders={reviewsWindow.items}
        window={reviewsWindow}
        states={states}
        prevHref={reviewLinks.prevHref}
        nextHref={reviewLinks.nextHref}
      />
      <details
        id="pedidos-para-vincular"
        className="mt-4 rounded-[var(--isalwa-radius-card)] border border-[var(--isalwa-mist)] bg-white px-4 py-3"
        open={Boolean(states.linkable.q || states.linkable.pagina)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-[var(--isalwa-kiln)]">
          Pedidos para vincular ({linkableWindow.matchedTotal})
        </summary>
        <div className="mt-4 space-y-4">
          <SurfaceSearchForm
            name="vincularQ"
            id="compras-vincular-search"
            query={states.linkable.q}
            placeholder="Pedido o cliente"
            states={states}
            surface="linkable"
          />
          <LinkableOrdersList
            orders={linkableWindow.items}
            emptyCopy={
              linkableWindow.zeroMatch ? 'Ningún pedido coincide con la búsqueda.' : undefined
            }
          />
          <ListPageNav
            from={linkableWindow.from}
            to={linkableWindow.to}
            total={linkableWindow.matchedTotal}
            page={linkableWindow.page}
            pageCount={linkableWindow.pageCount}
            prevHref={linkableLinks.prevHref}
            nextHref={linkableLinks.nextHref}
          />
        </div>
      </details>
    </>
  );
}

function PendingSupplyReviewsSection({
  orders,
  window,
  states,
  prevHref,
  nextHref,
}: {
  orders: LinkedOrderWithSupply[];
  window: ReturnType<typeof windowFilteredOpsCollection<LinkedOrderWithSupply>>;
  states: ComprasListStates;
  prevHref: string | null;
  nextHref: string | null;
}) {
  return (
    <OpsDeskSurface id="revisiones-pendientes" className="mb-4">
      <PageSection className="p-0 shadow-none" aria-label="Revisiones de abastecimiento pendientes">
        <SectionHeader
          kicker="Compras"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
              Revisiones pendientes
            </h2>
          }
        />
        <div className="mt-4">
          <SurfaceSearchForm
            name="revisionQ"
            id="compras-revision-search"
            query={states.reviews.q}
            placeholder="Pedido, cliente o referencia"
            states={states}
            surface="reviews"
          />
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
            {window.zeroMatch
              ? 'Ninguna revisión coincide con la búsqueda.'
              : 'Sin revisiones de abastecimiento abiertas.'}
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white">
            {orders.map((order) => {
              const review = order.supplyReview!;
              return (
                <PendingSupplyReviewCard
                  key={order.orderId}
                  partyId={order.partyId}
                  orderId={order.orderId}
                  orderNumber={order.orderNumber}
                  customerLabel={order.customerLabel}
                  reviewTitle={review.title}
                  workItemId={review.workItemId}
                  requesterMemberId={review.requesterMemberId}
                  requesterLabel={review.requesterLabel}
                />
              );
            })}
          </div>
        )}
        <ListPageNav
          from={window.from}
          to={window.to}
          total={window.matchedTotal}
          page={window.page}
          pageCount={window.pageCount}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      </PageSection>
    </OpsDeskSurface>
  );
}

function SurfaceSearchForm({
  name,
  id,
  query,
  placeholder,
  states,
  surface,
}: {
  name: 'revisionQ' | 'vincularQ';
  id: string;
  query: string | undefined;
  placeholder: string;
  states: ComprasListStates;
  surface: 'reviews' | 'linkable';
}) {
  const clearHref = comprasSurfaceHref(
    opsListHref('/compras', { ...states[surface], q: undefined, pagina: undefined }),
    surface,
    states,
  );
  return (
    <form method="get" action="/compras" className="flex flex-wrap items-end gap-3" role="search">
      <input type="hidden" name="q" value={states.queue.q ?? ''} />
      <input type="hidden" name="estado" value={states.estado ?? ''} />
      <input type="hidden" name="pagina" value={states.queue.pagina ?? ''} />
      {surface !== 'reviews' ? (
        <>
          <input type="hidden" name="revisionQ" value={states.reviews.q ?? ''} />
          <input type="hidden" name="revisionPagina" value={states.reviews.pagina ?? ''} />
        </>
      ) : null}
      {surface !== 'linkable' ? (
        <>
          <input type="hidden" name="vincularQ" value={states.linkable.q ?? ''} />
          <input type="hidden" name="vincularPagina" value={states.linkable.pagina ?? ''} />
        </>
      ) : null}
      <div className="min-w-[14rem] flex-1">
        <label htmlFor={id} className="isalwa-section-label">
          Buscar
        </label>
        <SearchField
          id={id}
          name={name}
          defaultValue={query ?? ''}
          placeholder={placeholder}
          className="mt-1.5"
        />
      </div>
      <Button type="submit" size="sm">
        Buscar
      </Button>
      {query ? (
        <Link
          href={clearHref}
          className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
        >
          Limpiar búsqueda
        </Link>
      ) : null}
    </form>
  );
}

function LinkableOrdersList({
  orders,
  emptyCopy,
}: {
  orders: LinkedOrderWithSupply[];
  emptyCopy?: string;
}) {
  const desktopGrid = 'md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]';
  const headerColumns = [
    { id: 'pedido', label: 'Pedido', className: 'min-w-0' },
    { id: 'client', label: 'Cliente', className: 'min-w-0' },
    { id: 'context', label: 'Contexto', className: 'min-w-0' },
    { id: 'status', label: 'Estado', className: 'justify-self-end' },
    { id: 'action', label: '', className: 'justify-self-end' },
  ];

  if (orders.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]">
        {emptyCopy ??
          'Sin pedidos abiertos para vincular. Abra el pedido desde el cliente cuando exista.'}
      </p>
    );
  }

  return (
    <div className="commercial-operating-list overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white">
      <OperatingScanListHeader columns={headerColumns} className={desktopGrid} />
      <ul className="m-0 list-none p-0">
        {orders.map((order) => {
          const href = orderHref(order.partyId, order.orderId);
          return (
            <li key={order.orderId}>
              <OperatingScanRow
                href={href}
                title={order.orderNumber}
                desktopGridClassName={desktopGrid}
                fields={[
                  { id: 'client', label: 'Cliente', value: order.customerLabel },
                  {
                    id: 'context',
                    label: 'Contexto',
                    value: 'Pedido abierto',
                    hideOnMobile: true,
                  },
                ]}
                status={
                  order.supplyReview ? (
                    <StatusPill tone="warning" icon="none">
                      Revisión de abastecimiento
                    </StatusPill>
                  ) : (
                    <StatusPill tone="neutral" icon="none">
                      Sin revisión abierta
                    </StatusPill>
                  )
                }
                actionLabel="Ver pedido"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
