import Link from 'next/link';
import { canRecordDelivery, canRecordWarehouseOutbound } from '@isalwa/os-contracts';
import { DeliveryDocumentsPanel } from '@/components/delivery/delivery-documents-panel';
import { EmptyState, ListRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { isPilotFacingHidden, presentEntregaAuditLabel } from '@/lib/delivery/display-labels';
import { quotedProductsFromQuoteLines } from '@/lib/commercial/quoted-product-context';
import { buildDeliveryProgress } from '@/lib/delivery/delivery-progress';
import { DeliveryProgressStrip } from '@/components/delivery/delivery-progress-strip';

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

  const visibleOrders = orders.filter(
    (order) =>
      !isPilotFacingHidden(order.customerName) &&
      !isPilotFacingHidden(order.orderNumber),
  );

  if (visibleOrders.length === 0) {
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
    visibleOrders.find((order) => order.orderId === selectedOrderId?.trim()) ?? visibleOrders[0]!;

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

  let quotedProducts: ReturnType<typeof quotedProductsFromQuoteLines> = [];
  let quoteUnavailable = false;
  let quoteLoadState: 'lines' | 'empty' | 'unavailable' | 'not_loaded' = 'not_loaded';
  const quoteId = selected.quoteId?.trim() ?? '';
  if (quoteId) {
    try {
      const pack = await client.getQuote(quoteId);
      quotedProducts = quotedProductsFromQuoteLines(pack.quote.lines);
      quoteLoadState = quotedProducts.length > 0 ? 'lines' : 'empty';
    } catch {
      quoteUnavailable = true;
      quotedProducts = [];
      quoteLoadState = 'unavailable';
    }
  }

  const hasSalida = timeline.some((item) => item.eventType === 'warehouse_exit.recorded');
  const hasNota = notes.some((note) => note.status === 'issued');
  const hasEntrega = timeline.some((item) => item.eventType === 'customer_delivery.recorded');
  const progress = buildDeliveryProgress({
    orderRecorded: true,
    hasNote: hasNota,
    hasSalida,
    hasEntrega,
  });
  const nextHint = !hasSalida
    ? 'Siguiente: Registrar salida (la nota no es obligatoria).'
    : !hasEntrega
      ? 'Siguiente: Registrar entrega (requiere «Recibido por»).'
      : 'Hay entrega registrada. Puede crear otra nota o registrar otra salida/entrega si corresponde.';

  return (
    <div className="mb-6" data-entrega-ops-desk="1">
      <PageSection card className="mb-4 p-5 md:p-6" aria-label="Pedidos disponibles para registrar">
        <SectionHeader
          kicker="Operación"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              Pedidos disponibles
            </h2>
          }
        />
        <ul className="mt-6">
          {visibleOrders.slice(0, 12).map((order) => {
            const active = order.orderId === selected.orderId;
            const customer = presentEntregaAuditLabel(order.customerName);
            const orderLabel = presentEntregaAuditLabel(order.orderNumber);
            return (
              <ListRow key={order.orderId} as="li">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{orderLabel}</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {customer} · {order.lines.length} línea(s)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {active ? <StatusPill tone="info">Seleccionado</StatusPill> : null}
                  <Link
                    href={`/entregas?orderId=${encodeURIComponent(order.orderId)}`}
                    className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                  >
                    Abrir pedido
                  </Link>
                </div>
              </ListRow>
            );
          })}
        </ul>
        {visibleOrders.length > 12 ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
            Se muestran los 12 pedidos abiertos más recientes.
          </p>
        ) : null}
      </PageSection>

      <div className="mb-4 space-y-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4" data-entrega-pedido-summary="">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">Pedido {presentEntregaAuditLabel(selected.orderNumber)}</StatusPill>
          <StatusPill tone="neutral">{presentEntregaAuditLabel(selected.customerName)}</StatusPill>
        </div>
        <DeliveryProgressStrip steps={progress} />
        <p className="text-sm text-[var(--isalwa-kiln)]">{nextHint}</p>
      </div>
      <DeliveryDocumentsPanel
        partyId={selected.partyId}
        orderId={selected.orderId}
        orderNumber={selected.orderNumber}
        customerName={presentEntregaAuditLabel(selected.customerName)}
        actorMemberId={capabilities.memberId}
        orderLines={selected.lines}
        notes={notes}
        timeline={timeline}
        canMutate={selected.status === 'open'}
        canCreateNote={selected.status === 'open' && canRecordDelivery(scopes)}
        canRecordSalida={selected.status === 'open' && canRecordWarehouseOutbound(scopes)}
        canRecordEntrega={selected.status === 'open' && canRecordDelivery(scopes)}
        hasSalida={hasSalida}
        quotedProducts={quotedProducts}
        quoteUnavailable={quoteUnavailable}
        quoteLoadState={quoteLoadState}
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
