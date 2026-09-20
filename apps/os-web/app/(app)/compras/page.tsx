import Link from 'next/link';
import {
  EmptyState,
  OperatingRow,
  PageContainer,
  PageSection,
  SectionHeader,
  StatGroup,
  StatusPill,
} from '@isalwa/ui';
import { PurchaseRequestPanel } from '@/components/purchasing/purchase-request-panel';
import { ResolvePurchasingReviewForm } from '@/components/purchasing/resolve-purchasing-review-form';
import { PageHeader } from '@/components/shell/page-header';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { orderHref } from '@/lib/commercial/navigation';
import { COMPRAS_COPY } from '@/lib/purchasing/queue';
import { loadComprasQueue } from '@/lib/purchasing/load-queue';
import { loadComprasLinkedOrders, type ComprasLinkedOrder } from '@/lib/purchasing/load-linked-orders';
import { ListCapNotice } from '@/components/lists/list-cap-notice';
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';
import { workItemHref } from '@/lib/work/navigation';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';

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
  } | null;
};

function one(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ComprasPage({ searchParams }: ComprasPageProps) {
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'compras')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Compras" />;
  }
  const query = await searchParams;
  const q = one(query.q);
  const estado = one(query.estado);
  const [queue, linked] = await Promise.all([
    loadComprasQueue({ q, buyer: one(query.buyer), estado }),
    loadComprasLinkedWithSupply(),
  ]);
  const linkedOrders = linked.orders;
  const abastecimientoCount = linkedOrders.filter((row) => row.supplyReview).length;

  return (
    <PageContainer
      label={COMPRAS_COPY.title}
      data-tour={queue.state === 'ready' ? COMPRAS_FILTER_TARGET : undefined}
    >
      <PageHeader
        kicker={COMPRAS_COPY.kicker}
        title={queue.state === 'permission' ? COMPRAS_COPY.permissionTitle : COMPRAS_COPY.title}
        description={
          queue.state === 'permission' ? COMPRAS_COPY.permissionDescription : COMPRAS_COPY.description
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="manual">No es inventario</StatusPill>
            <StatusPill tone="neutral">Sin OC automática</StatusPill>
          </div>
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
      {queue.state === 'ready' ? (
        <PurchaseRequestPanel
          state="ready"
          items={queue.items}
          count={queue.count}
          buyerSuggestions={queue.buyerSuggestions}
          query={q}
          statusFilter={estado}
        />
      ) : (
        <PurchaseRequestPanel state={queue.state} />
      )}
      {queue.state === 'ready' || queue.state === 'permission' ? (
        <LinkedOrdersSection orders={linkedOrders} />
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
    return {
      listCaps,
      orders: orders.map((order) => {
      const open = findOpenOrderPrepReviews(workItems, order.orderId, order.partyId);
      return {
        ...order,
        supplyReview: open.purchasing
          ? {
              workItemId: open.purchasing.workItemId,
              title: open.purchasing.title,
              requesterMemberId:
                workItems.find((row) => row.workItemId === open.purchasing?.workItemId)
                  ?.createdByMemberId ?? '',
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
function LinkedOrdersSection({ orders }: { orders: LinkedOrderWithSupply[] }) {
  return (
    <OpsDeskSurface className="mb-4">
    <PageSection className="p-0 shadow-none" aria-label="Pedidos para vincular">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos para vincular
          </h2>
        }
      />
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Si la solicitud corresponde a un pedido, ábralo o selecciónelo de la lista. La revisión de
        abastecimiento solo aparece cuando ya hay Trabajo abierto — no se inventa OC ni stock.
      </p>
      {orders.length === 0 ? (
        <div data-owner-review-state="no-data" className="mt-4">
          <EmptyState
            title="Sin pedidos abiertos para vincular"
            description="Los pedidos aparecen aquí para vincularlos. La revisión de compras se solicita desde el pedido. Esta lista no crea pedidos ni órdenes de compra."
            example="Abra el pedido desde el cliente. No se duplican líneas comerciales en compras."
          />
        </div>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white">
          {orders.map((order) => (
            <li key={order.orderId}>
              <OperatingRow
                href={orderHref(order.partyId, order.orderId)}
                subject={order.orderNumber}
                meta={`${order.customerLabel} · Pedido abierto · sin obligación automática de compra`}
                status={
                  order.supplyReview ? (
                    <StatusPill tone="warning">Revisión de abastecimiento</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Sin revisión abierta</StatusPill>
                  )
                }
                actions={
                  order.supplyReview ? (
                    <div className="flex flex-col items-end gap-1">
                      <Link
                        href={workItemHref(order.supplyReview.workItemId)}
                        className="text-xs font-medium text-[var(--isalwa-glaze)] hover:underline"
                      >
                        Ver revisión
                      </Link>
                      <ResolvePurchasingReviewForm
                        workItemId={order.supplyReview.workItemId}
                        requesterMemberId={order.supplyReview.requesterMemberId}
                        partyId={order.partyId}
                        orderId={order.orderId}
                        orderNumber={order.orderNumber}
                      />
                    </div>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      )}
    </PageSection>
    </OpsDeskSurface>
  );
}
