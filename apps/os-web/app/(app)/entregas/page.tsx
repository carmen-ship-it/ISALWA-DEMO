import Link from 'next/link';
import { EmptyState, ListRow, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { EntregaPanel } from '@/components/delivery/entrega-panel';
import { PageHeader } from '@/components/shell/page-header';
import { loadEntregaPage } from '@/lib/delivery/load-entregas';
import type { LinkedOrderFact } from '@/lib/delivery/map-fulfillment';
import { orderHref } from '@/lib/commercial/navigation';

export default async function EntregasPage() {
  const view = await loadEntregaPage();
  const panelStatus =
    view.status === 'ready' || view.status === 'empty' ? 'ready' : view.status;

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
      <LinkedOrdersSection orders={view.linkedOrders} />
      <EntregaPanel
        status={panelStatus}
        warehouseExits={view.warehouseExits}
        deliveries={view.deliveries}
      />
    </PageContainer>
  );
}

function LinkedOrdersSection({ orders }: { orders: LinkedOrderFact[] }) {
  return (
    <PageSection card className="mb-6 p-6 md:p-8" aria-label="Pedidos vinculados">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos de esta empresa
          </h2>
        }
      />
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Abra el pedido ya registrado de la lista. No se inventa una entrega desde el pedido.
      </p>
      {orders.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Todavía no hay pedidos abiertos"
          description="Cuando exista un pedido en esta empresa, aparecerá aquí para vincular salidas y entregas sin volver a escribir las líneas."
          example="Convierta una cotización aceptada a pedido desde el cliente. Aquí no se crean pedidos."
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
