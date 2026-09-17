import Link from 'next/link';
import { EmptyState, ListRow, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { EntregaOperationalWriteDesk } from '@/components/delivery/entrega-operational-write-desk';
import { EntregaPanel } from '@/components/delivery/entrega-panel';
import { DeliveryProgressStrip } from '@/components/delivery/delivery-progress-strip';
import { EntregaSummaryStrip } from '@/components/delivery/entrega-summary-strip';
import {
  OWNER_REVIEW_V1_COPY,
  V1FlowValidateNotice,
} from '@/components/owner-review/v1-flow-validate-notice';
import { PageHeader } from '@/components/shell/page-header';
import { EventWorkOfferPanel } from '@/components/work/event-work-offer-panel';
import { buildDeliveryProgress } from '@/lib/delivery/delivery-progress';
import { loadEntregaPage } from '@/lib/delivery/load-entregas';
import type { LinkedOrderFact } from '@/lib/delivery/map-fulfillment';
import { offerAfterDeliveryFollowUp } from '@/lib/work/event-work-offer';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

export default async function EntregasPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'entregas')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Entregas" />;
  }
  const params = searchParams ? await searchParams : undefined;
  const view = await loadEntregaPage();
  const panelStatus =
    view.status === 'ready' || view.status === 'empty' ? 'ready' : view.status;
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

  return (
    <PageContainer label="Entregas">
      <PageHeader
        kicker="Entrega"
        title="Entregas"
        description="Registro interno de salida y entrega. No reclama un número oficial."
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="neutral">Sin número oficial</StatusPill>
            <StatusPill tone="manual">Registro interno</StatusPill>
          </div>
        }
      />
      <V1FlowValidateNotice
        className="mb-6"
        title={OWNER_REVIEW_V1_COPY.entregasTitle}
        description={OWNER_REVIEW_V1_COPY.entregasDescription}
      />
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
      <EntregaOperationalWriteDesk selectedOrderId={params?.orderId ?? null} />
      <LinkedOrdersSection
        orders={view.linkedOrders}
        noteOrderIds={noteOrderIds}
        exitOrderIds={exitOrderIds}
        deliveredOrderIds={deliveredOrderIds}
      />
      <EntregaPanel
        status={panelStatus}
        warehouseExits={view.warehouseExits}
        deliveries={view.deliveries}
      />
    </PageContainer>
  );
}

function LinkedOrdersSection({
  orders,
  noteOrderIds,
  exitOrderIds,
  deliveredOrderIds,
}: {
  orders: LinkedOrderFact[];
  noteOrderIds: Set<string>;
  exitOrderIds: Set<string>;
  deliveredOrderIds: Set<string>;
}) {
  return (
    <PageSection card className="mb-6 p-5 md:p-6" aria-label="Pedidos vinculados">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos de esta empresa
          </h2>
        }
      />
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Abra el pedido ya registrado de la lista. El progreso Nota de Entrega / Salida / Entrega usa solo
        hechos registrados — no se inventa una entrega desde el pedido.
      </p>
      {orders.length === 0 ? (
        <div data-owner-review-state="no-data" className="mt-6">
          <EmptyState
            title="Todavía no hay pedidos abiertos"
            description="Cuando exista un pedido en esta empresa, aparecerá aquí para vincular salidas y entregas sin volver a escribir las líneas."
            example="Convierta una cotización aceptada a pedido desde el cliente. Aquí no se crean pedidos."
          />
        </div>
      ) : (
        <ul className="mt-6">
          {orders.map((order) => {
            const progress = buildDeliveryProgress({
              orderRecorded: true,
              hasNote: noteOrderIds.has(order.orderId),
              hasSalida: exitOrderIds.has(order.orderId),
              hasEntrega: deliveredOrderIds.has(order.orderId),
            });
            return (
              <ListRow key={order.orderId} as="li" className="items-start gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {order.customerLabel?.trim() || 'Cliente'}
                    {' · '}
                    Pedido abierto
                  </p>
                  <DeliveryProgressStrip className="mt-2" steps={progress} />
                </div>
                <Link
                  href={`/entregas?orderId=${encodeURIComponent(order.orderId)}`}
                  className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                >
                  Registrar en Entregas
                </Link>
              </ListRow>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}
