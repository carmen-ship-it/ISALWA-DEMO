import Link from 'next/link';
import { canRecordDelivery, canRecordWarehouseOutbound } from '@isalwa/os-contracts';
import { DeliveryDocumentsPanel } from '@/components/delivery/delivery-documents-panel';
import { EmptyState, ListRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';

type Props = {
  selectedOrderId?: string | null;
};

/**
 * Entregas write desk: delivery/outbound scopes only.
 * Does not require commercial-read or opening Cliente pedido URL.
 */
export async function EntregaOperationalWriteDesk({ selectedOrderId = null }: Props) {
  const capabilities = await loadMemberCapabilities();
  if (!capabilities) return null;
  const scopes = capabilities.grantedScopes;
  const canWrite =
    canRecordDelivery(scopes) || canRecordWarehouseOutbound(scopes);
  if (!canWrite) return null;

  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const client = createOsApiClient(auth);

  let orders: Awaited<ReturnType<typeof client.listDeliveryOperationalOrders>>['items'] = [];
  try {
    const page = await client.listDeliveryOperationalOrders();
    orders = page.items ?? [];
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return (
        <PageSection card className="mb-6 p-5 md:p-6" aria-label="Registro operativo">
          <p className="text-sm text-[var(--isalwa-slate)]">
            No tienes permiso para registrar notas, salidas o entregas en esta empresa.
          </p>
        </PageSection>
      );
    }
    return (
      <PageSection card className="mb-6 p-5 md:p-6" aria-label="Registro operativo">
        <p className="text-sm text-[var(--isalwa-slate)]">
          No se pudieron cargar los pedidos para registro operativo. Intente de nuevo.
        </p>
      </PageSection>
    );
  }

  if (orders.length === 0) {
    return (
      <PageSection card className="mb-6 p-5 md:p-6" aria-label="Registro operativo">
        <SectionHeader
          kicker="Operación"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              Registrar desde pedido
            </h2>
          }
        />
        <div className="mt-6">
          <EmptyState
            title="Todavía no hay pedidos abiertos"
            description="Cuando exista un pedido abierto, podrá crear la nota, registrar la salida y la entrega aquí sin abrir la ficha comercial."
          />
        </div>
      </PageSection>
    );
  }

  const selected =
    orders.find((order) => order.orderId === selectedOrderId?.trim()) ?? orders[0]!;

  let notes: Array<{
    id: string;
    internalDocumentRef: string;
    status: 'issued' | 'reversed';
    recipient: string;
    deliveredBy: string;
    receivedBy: string | null;
    observations: string | null;
    bornAt: string;
    lines: Array<{
      orderLineId: string;
      description: string;
      quantity: number;
      unitLabel: string | null;
      productRef: string | null;
    }>;
  }> = [];
  let timeline: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
    label: string;
    detail: string;
  }> = [];

  try {
    const pack = await client.getDeliveryOperationalDocuments(selected.orderId);
    notes = (pack.notes ?? []).map((note) => ({
      id: note.id,
      internalDocumentRef: note.internalDocumentRef,
      status: note.status,
      recipient: note.recipient,
      deliveredBy: note.deliveredBy,
      receivedBy: note.receivedBy,
      observations: note.observations,
      bornAt: note.bornAt,
      lines: (note.lines ?? []).map((line) => ({
        orderLineId: line.orderLineId,
        description: line.description,
        quantity: line.quantity,
        unitLabel: line.unitLabel ?? null,
        productRef: line.productRef ?? null,
      })),
    }));
    timeline = (pack.timeline ?? []).map((item) => ({
      id: item.id,
      eventType: item.eventType,
      occurredAt: item.occurredAt,
      label: item.label,
      detail: item.detail ?? '',
    }));
  } catch {
    notes = [];
    timeline = [];
  }

  return (
    <div className="mb-6" data-entrega-ops-desk="1">
      <PageSection card className="mb-4 p-5 md:p-6" aria-label="Pedidos disponibles para registrar">
        <SectionHeader
          kicker="Operación"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              Pendientes / disponibles para registrar
            </h2>
          }
        />
        <ul className="mt-6">
          {orders.slice(0, 12).map((order) => {
            const active = order.orderId === selected.orderId;
            return (
              <ListRow key={order.orderId} as="li">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {order.customerName} · {order.lines.length} línea(s)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {active ? <StatusPill tone="info">Seleccionado</StatusPill> : null}
                  <Link
                    href={`/entregas?orderId=${encodeURIComponent(order.orderId)}`}
                    className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                  >
                    Registrar aquí
                  </Link>
                </div>
              </ListRow>
            );
          })}
        </ul>
        {orders.length > 12 ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
            Se muestran los 12 pedidos abiertos más recientes.
          </p>
        ) : null}
      </PageSection>

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusPill tone="neutral">Pedido {selected.orderNumber}</StatusPill>
        <StatusPill tone="manual">Registro en Entregas</StatusPill>
        {canRecordDelivery(scopes) ? (
          <StatusPill tone="manual">Puede crear nota y entrega</StatusPill>
        ) : (
          <StatusPill tone="manual">Puede registrar salida</StatusPill>
        )}
      </div>
      <DeliveryDocumentsPanel
        partyId={selected.partyId}
        orderId={selected.orderId}
        orderNumber={selected.orderNumber}
        customerName={selected.customerName}
        actorMemberId={capabilities.memberId}
        orderLines={selected.lines}
        notes={notes}
        timeline={timeline}
        canMutate={selected.status === 'open'}
        canCreateNote={selected.status === 'open' && canRecordDelivery(scopes)}
        canRecordSalida={selected.status === 'open' && canRecordWarehouseOutbound(scopes)}
        canRecordEntrega={selected.status === 'open' && canRecordDelivery(scopes)}
      />
      <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
        Este registro no exige abrir la ficha comercial del pedido.{' '}
        <Link className="underline underline-offset-2" href="/almacen">
          Ir a Almacén
        </Link>
      </p>
    </div>
  );
}
