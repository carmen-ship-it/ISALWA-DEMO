import Link from 'next/link';
import {
  EmptyState,
  ListRow,
  PageContainer,
  PageSection,
  SectionHeader,
  StatGroup,
  StatusPill,
} from '@isalwa/ui';
import { PurchaseRequestPanel } from '@/components/purchasing/purchase-request-panel';
import { PageHeader } from '@/components/shell/page-header';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { orderHref } from '@/lib/commercial/navigation';
import { COMPRAS_COPY } from '@/lib/purchasing/queue';
import { loadComprasQueue } from '@/lib/purchasing/load-queue';
import { loadComprasLinkedOrders, type ComprasLinkedOrder } from '@/lib/purchasing/load-linked-orders';
import { workItemHref } from '@/lib/work/navigation';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

/** CROSS_LANE: add 'comprasFilter' to TOUR_TARGET in lib/walkthrough/targets.ts */
const COMPRAS_FILTER_TARGET = 'compras-filter';

type ComprasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LinkedOrderWithSupply = ComprasLinkedOrder & {
  supplyReview: { workItemId: string; title: string } | null;
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
  const [queue, linkedOrders] = await Promise.all([
    loadComprasQueue({ q, buyer: one(query.buyer), estado }),
    loadComprasLinkedWithSupply(),
  ]);
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
          className="mb-6"
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
      {queue.state === 'ready' || queue.state === 'permission' ? (
        <LinkedOrdersSection orders={linkedOrders} />
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
    </PageContainer>
  );
}

async function loadComprasLinkedWithSupply(): Promise<LinkedOrderWithSupply[]> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return [];
    const client = createOsApiClient(auth);
    const [orders, workPage] = await Promise.all([
      loadComprasLinkedOrders(),
      client.listWorkItems({ status: 'open', limit: 100 }).catch(() => ({ items: [] as const })),
    ]);
    const workItems = workPage.items ?? [];
    return orders.map((order) => {
      const open = findOpenOrderPrepReviews(workItems, order.orderId, order.partyId);
      return {
        ...order,
        supplyReview: open.purchasing
          ? { workItemId: open.purchasing.workItemId, title: open.purchasing.title }
          : null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Honest order picker surface. Purchase request SoR write remains FOUNDATION_GAP
 * (no hosted API command / prisma write registered). Operators link by orderId
 * instead of retyping pedido lines. No automatic PO.
 */
function LinkedOrdersSection({ orders }: { orders: LinkedOrderWithSupply[] }) {
  return (
    <PageSection card className="mb-6 p-6 md:p-8" aria-label="Pedidos para vincular">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos para vincular
          </h2>
        }
      />
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Si la solicitud corresponde a un pedido, ábralo o selecciónelo de la lista. La revisión de
        abastecimiento solo aparece cuando ya hay Trabajo abierto — no se inventa OC ni stock.
      </p>
      {orders.length === 0 ? (
        <div data-owner-review-state="no-data" className="mt-6">
          <EmptyState
            title="Sin pedidos abiertos para vincular"
            description="Los pedidos aparecen aquí para vincularlos. La revisión de compras se solicita desde el pedido. Esta lista no crea pedidos ni órdenes de compra."
            example="Abra el pedido desde el cliente. No se duplican líneas comerciales en compras."
          />
        </div>
      ) : (
        <ul className="mt-6">
          {orders.map((order) => (
            <ListRow key={order.orderId} as="li" className="items-start gap-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{order.orderNumber}</p>
                  {order.supplyReview ? (
                    <StatusPill tone="warning">Revisión de abastecimiento</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Sin revisión abierta</StatusPill>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  {order.customerLabel}
                  {' · '}
                  Pedido abierto · sin obligación automática de compra
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {order.supplyReview ? (
                  <Link
                    href={workItemHref(order.supplyReview.workItemId)}
                    className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                  >
                    Ver revisión
                  </Link>
                ) : null}
                <Link
                  href={orderHref(order.partyId, order.orderId)}
                  className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                >
                  Abrir pedido
                </Link>
              </div>
            </ListRow>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
