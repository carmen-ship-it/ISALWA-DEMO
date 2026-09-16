import Link from 'next/link';
import { EmptyState, ListRow, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { PurchaseRequestPanel } from '@/components/purchasing/purchase-request-panel';
import { PageHeader } from '@/components/shell/page-header';
import { orderHref } from '@/lib/commercial/navigation';
import { COMPRAS_COPY } from '@/lib/purchasing/queue';
import { loadComprasQueue } from '@/lib/purchasing/load-queue';
import { loadComprasLinkedOrders, type ComprasLinkedOrder } from '@/lib/purchasing/load-linked-orders';

/** CROSS_LANE: add 'comprasFilter' to TOUR_TARGET in lib/walkthrough/targets.ts */
const COMPRAS_FILTER_TARGET = 'compras-filter';

type ComprasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ComprasPage({ searchParams }: ComprasPageProps) {
  const query = await searchParams;
  const q = one(query.q);
  const estado = one(query.estado);
  const [queue, linkedOrders] = await Promise.all([
    loadComprasQueue({ q, buyer: one(query.buyer), estado }),
    loadComprasLinkedOrders(),
  ]);

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
          </div>
        }
      />
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

/**
 * Honest order picker surface. Purchase request SoR write remains FOUNDATION_GAP
 * (no hosted API command / prisma write registered). Operators link by orderId
 * instead of retyping pedido lines.
 */
function LinkedOrdersSection({ orders }: { orders: ComprasLinkedOrder[] }) {
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
        Si la solicitud corresponde a un pedido, ábralo o selecciónelo de la lista. No reescriba las
        líneas del pedido aquí. La cola de compras no inventa inventario.
      </p>
      {orders.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Sin pedidos abiertos para vincular"
          description="Cuando exista un pedido en esta empresa, aparecerá aquí. La cola local vacía no es un fallo de stock."
          example="Abra el pedido desde el cliente. No se duplican líneas comerciales en compras."
        />
      ) : (
        <ul className="mt-6">
          {orders.map((order) => (
            <ListRow key={order.orderId} as="li">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{order.orderNumber}</p>
                <p className="mt-1 font-mono text-xs text-[var(--isalwa-slate)]">{order.orderId}</p>
              </div>
              <Link
                href={orderHref(order.partyId, order.orderId)}
                className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
              >
                Abrir pedido
              </Link>
            </ListRow>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
