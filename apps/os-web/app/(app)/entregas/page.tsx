import Link from 'next/link';
import {
  EmptyState,
  OperatingRow,
  PageContainer,
  PageSection,
  SearchField,
  SectionHeader,
} from '@isalwa/ui';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { EntregaOperationalWriteDesk } from '@/components/delivery/entrega-operational-write-desk';
import { EntregaPanel } from '@/components/delivery/entrega-panel';
import { EntregaPageDisclaimer } from '@/components/delivery/entrega-page-disclaimer';
import { EntregaSectionNav } from '@/components/delivery/entrega-section-nav';
import { DeliveryProgressStrip } from '@/components/delivery/delivery-progress-strip';
import { EntregaSummaryStrip } from '@/components/delivery/entrega-summary-strip';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { PageHeader } from '@/components/shell/page-header';
import { EventWorkOfferPanel } from '@/components/work/event-work-offer-panel';
import { buildDeliveryProgress } from '@/lib/delivery/delivery-progress';
import { loadEntregaPage } from '@/lib/delivery/load-entregas';
import { resolveEntregaHistoryPanel } from '@/lib/delivery/surface';
import {
  canOperateEntregaDesk,
  deliveryPresentationScopes,
} from '@/lib/delivery/permission-aware-ui';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import type { LinkedOrderFact } from '@/lib/delivery/map-fulfillment';
import { isPilotFacingHidden, presentEntregaAuditLabel } from '@/lib/delivery/display-labels';
import { offerAfterDeliveryFollowUp } from '@/lib/work/event-work-offer';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import {
  matchesOpsSearch,
  opsBoundedPageHrefs,
  opsListHref,
  windowFilteredOpsCollection,
  type ListQueryState,
} from '@/lib/lists/ops-collection';

export default async function EntregasPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string; datos?: string; q?: string; pagina?: string }>;
}) {
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'entregas')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Entregas" />;
  }
  const params = searchParams ? await searchParams : undefined;
  const selectedOrderId = params?.orderId?.trim() || null;
  const datos = params?.datos?.trim() || null;
  const listState: ListQueryState = { q: params?.q, pagina: params?.pagina };
  const view = await loadEntregaPage();
  const capabilities = await loadMemberCapabilities();
  const deliveryScopes = deliveryPresentationScopes({
    grantedScopes: capabilities?.grantedScopes ?? [],
    evaluationActive: evaluation.active,
    presentationScopes: evaluation.presentationScopes,
  });
  const panelStatus = resolveEntregaHistoryPanel({
    surfaceStatus: view.status,
    fulfillmentReadDenied: view.fulfillmentReadDenied,
    canOperateDesk: canOperateEntregaDesk(deliveryScopes),
  });
  const firstDelivery = view.deliveries[0];
  const deliveryOffer = offerAfterDeliveryFollowUp({
    deliveryId: firstDelivery?.id ?? null,
    deliveredAt: firstDelivery?.deliveredAt ?? null,
    partyId: view.linkedOrders[0]?.partyId ?? null,
  });

  const deliveredOrderIds = new Set(
    view.deliveries.map((row) => row.orderId?.trim()).filter((id): id is string => Boolean(id)),
  );
  const exitOrderIds = new Set(
    view.warehouseExits.map((row) => row.orderId?.trim()).filter((id): id is string => Boolean(id)),
  );
  const noteOrderIds = new Set(view.noteOrderIds);

  const warehouseExits = selectedOrderId
    ? view.warehouseExits.filter((row) => row.orderId?.trim() === selectedOrderId)
    : view.warehouseExits;
  const deliveries = selectedOrderId
    ? view.deliveries.filter((row) => row.orderId?.trim() === selectedOrderId)
    : view.deliveries;

  return (
    <PageContainer label="Entregas">
      <PageHeader kicker="Operación" title="Entregas" />
      <EntregaPageDisclaimer />
      <EntregaSectionNav />
      {deliveryOffer.offered ? (
        <div className="mb-6">
          <EventWorkOfferPanel offer={deliveryOffer} />
        </div>
      ) : null}
      <EntregaSummaryStrip
        deliveryNotesCount={view.deliveryNotesCount}
        warehouseExits={view.warehouseExits.map((row) => ({
          orderId: row.orderId?.trim() || '',
        }))}
        deliveries={view.deliveries.map((row) => ({
          orderId: row.orderId?.trim() || '',
          deliveredAt: row.deliveredAt,
        }))}
      />
      <EntregaOperationalWriteDesk
        selectedOrderId={selectedOrderId}
        datos={datos}
        listState={listState}
      />
      {view.commercialReadDenied ? null : (
      <LinkedOrdersSection
        orders={view.linkedOrders}
        noteOrderIds={noteOrderIds}
        exitOrderIds={exitOrderIds}
        deliveredOrderIds={deliveredOrderIds}
        selectedOrderId={selectedOrderId}
        datos={datos}
        listState={listState}
      />
      )}
      <EntregaPanel status={panelStatus} warehouseExits={warehouseExits} deliveries={deliveries} />
    </PageContainer>
  );
}

function LinkedOrdersSection({
  orders,
  noteOrderIds,
  exitOrderIds,
  deliveredOrderIds,
  selectedOrderId,
  datos,
  listState,
}: {
  orders: LinkedOrderFact[];
  noteOrderIds: Set<string>;
  exitOrderIds: Set<string>;
  deliveredOrderIds: Set<string>;
  selectedOrderId: string | null;
  datos: string | null;
  listState: ListQueryState;
}) {
  const visibleOrders = orders.filter(
    (order) => !isPilotFacingHidden(order.orderNumber) && !isPilotFacingHidden(order.customerLabel),
  );
  const orderWindow = windowFilteredOpsCollection(visibleOrders, {
    q: listState.q,
    pagina: listState.pagina,
    match: (order, q) =>
      matchesOpsSearch(q, [order.orderNumber, order.customerLabel, order.orderId]),
  });
  const nav = opsBoundedPageHrefs('/entregas', listState, orderWindow.page, orderWindow.pageCount, {
    orderId: selectedOrderId,
    datos,
  });

  return (
    <OpsDeskSurface className="mb-4">
      <PageSection className="p-0 shadow-none" aria-label="Pedidos vinculados">
        <SectionHeader
          kicker="Pedido"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
              Pedidos de esta empresa
            </h2>
          }
        />
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Abra un pedido para ver nota, salida y entrega registradas.
        </p>
        <form action="/entregas" className="mt-4 flex flex-wrap items-center gap-2">
          {selectedOrderId ? <input type="hidden" name="orderId" value={selectedOrderId} /> : null}
          {datos ? <input type="hidden" name="datos" value={datos} /> : null}
          <SearchField
            name="q"
            defaultValue={listState.q}
            placeholder="Buscar pedido o cliente"
            aria-label="Buscar pedidos vinculados"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-sm font-medium text-[var(--isalwa-kiln)]"
          >
            Buscar
          </button>
        </form>
        {orderWindow.trueEmpty ? (
          <div data-owner-review-state="no-data" className="mt-4">
            <EmptyState
              title="Todavía no hay pedidos abiertos"
              description="Los pedidos aparecen aquí después de convertir una cotización elegible."
              example="Convierta una cotización aceptada a pedido desde el cliente."
            />
          </div>
        ) : orderWindow.zeroMatch ? (
          <div data-owner-review-state="no-match" className="mt-4">
            <EmptyState
              title="No hay pedidos que coincidan"
              description="Cambie la búsqueda para volver a ver los pedidos vinculados."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {orderWindow.items.map((order) => {
              const progress = buildDeliveryProgress({
                orderRecorded: true,
                hasNote: noteOrderIds.has(order.orderId),
                hasSalida: exitOrderIds.has(order.orderId),
                hasEntrega: deliveredOrderIds.has(order.orderId),
              });
              const customer = presentEntregaAuditLabel(order.customerLabel ?? 'Cliente');
              const orderLabel = presentEntregaAuditLabel(order.orderNumber);
              const orderHref = opsListHref('/entregas', listState, {
                orderId: order.orderId,
                datos,
              });
              return (
                <li
                  key={order.orderId}
                  className="overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white"
                >
                  <OperatingRow
                    href={orderHref}
                    subject={orderLabel}
                    meta={`${customer} · Pedido abierto`}
                    actions={
                      <Link
                        href={orderHref}
                        className="text-xs font-medium text-[var(--isalwa-glaze)] hover:underline"
                      >
                        Abrir pedido
                      </Link>
                    }
                  />
                  <div className="border-t border-[var(--isalwa-mist)] px-3 pb-2 pt-1">
                    <DeliveryProgressStrip className="mt-0" steps={progress} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <ListPageNav
          from={orderWindow.from}
          to={orderWindow.to}
          total={orderWindow.total}
          page={orderWindow.page}
          pageCount={orderWindow.pageCount}
          prevHref={nav.prevHref}
          nextHref={nav.nextHref}
        />
      </PageSection>
    </OpsDeskSurface>
  );
}
