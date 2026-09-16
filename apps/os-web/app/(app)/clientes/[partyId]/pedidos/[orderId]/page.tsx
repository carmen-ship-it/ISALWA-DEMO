import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { CommercialApprovalPanel } from '@/components/commercial/commercial-approval-panel';
import { CommercialPath } from '@/components/commercial/commercial-path';
import { OrderLines } from '@/components/commercial/order-lines';
import { RecordNextStep } from '@/components/commercial/record-next-step';
import { DeliveryDocumentsPanel } from '@/components/delivery/delivery-documents-panel';
import { OrderCasePanel } from '@/components/operations/order-case-panel';
import { PedidoOperatingSummary } from '@/components/operations/pedido-operating-summary';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  formatOrderStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { quoteHref } from '@/lib/commercial/navigation';
import { orderNextStep } from '@/lib/commercial/next-step';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { buildPedidoOperatingView } from '@/lib/operations/pedido-case';
import { partyHref } from '@/lib/party/navigation';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type OrderDetailPageProps = {
  params: Promise<{ partyId: string; orderId: string }>;
  searchParams: Promise<{ resultado?: string }>;
};

const documentLinkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const { partyId, orderId } = await params;
  const { resultado } = await searchParams;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { order, freshness, authority } = await client.getOrder(orderId);
    if (auth.mode === 'dev' && auth.session.organizationId !== order.organizationId) {
      return (
        <PageContainer label="Pedido">
          <AccessDeniedState />
        </PageContainer>
      );
    }

    const partyLabels = await resolvePartyLabels(client, [order.partyId]);
    const customerName = partyLabel(partyLabels, order.partyId);
    const memberLabels = await resolveMemberLabels(client, [order.ownerMemberId]);
    const ownerLabel = memberLabel(memberLabels, order.ownerMemberId);
    let sourceQuoteNumber: string | null = null;
    if (order.quoteId) {
      try {
        const { quote } = await client.getQuote(order.quoteId);
        sourceQuoteNumber = quote.quoteNumber;
      } catch {
        sourceQuoteNumber = null;
      }
    }
    let approvalMemberLabels = new Map<string, string>();
    let approvals: SubjectApprovalItem[] = [];
    if (order.status === 'open') {
      try {
        const history = await client.listSubjectApprovals('order', order.orderId);
        approvals = history.items as SubjectApprovalItem[];
        const ids = [
          ...new Set(approvals.flatMap((row) => [row.approverMemberId, row.requestedByMemberId].filter(Boolean))),
        ] as string[];
        approvalMemberLabels = await resolveMemberLabels(client, ids);
      } catch {
        approvalMemberLabels = new Map();
        approvals = [];
      }
    }

    const actorMemberId = auth.mode === 'dev' ? auth.session.memberId : null;
    const operating = buildPedidoOperatingView({
      order: {
        organizationId: order.organizationId,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        partyId: order.partyId,
        customerName,
        ownerMemberId: order.ownerMemberId,
        ownerLabel,
        statusLabel: formatOrderStatus(order.status),
        createdAt: order.createdAt,
        cancelledAt: order.cancelledAt,
      },
      actorMemberId,
      asOf: new Date(),
      apiAuthorizedDocument: true,
      grants: [],
      allocations: null,
      deliveries: null,
      classification: null,
      customerDate: null,
      productionDate: null,
    });

    let deliveryNotes: Array<{
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
    let deliveryTimeline: Array<{
      id: string;
      eventType: string;
      occurredAt: string;
      label: string;
      detail: string;
    }> = [];
    try {
      const docs = await client.get<{
        notes: Array<{
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
        }>;
        timeline: Array<{
          id: string;
          eventType: string;
          occurredAt: string;
          payload?: Record<string, unknown>;
        }>;
      }>('/delivery-notes', { orderId: order.orderId });
      deliveryNotes = docs.notes ?? [];
      deliveryTimeline = (docs.timeline ?? []).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        label:
          event.eventType === 'delivery_note.created'
            ? 'Nota de entrega creada'
            : event.eventType === 'warehouse_exit.recorded'
              ? 'Salida de almacén'
              : event.eventType === 'customer_delivery.recorded'
                ? 'Entrega al cliente'
                : event.eventType === 'delivery_note.corrected'
                  ? 'Nota corregida'
                  : event.eventType,
        detail: event.eventType,
      }));
    } catch {
      deliveryNotes = [];
      deliveryTimeline = [];
    }

    return (
      <PageContainer label={order.orderNumber}>
        <CommercialPath
          crumbs={[
            { label: customerName, href: partyHref(partyId) },
            ...(order.quoteId
              ? [
                  {
                    label: sourceQuoteNumber ?? 'Cotización',
                    href: quoteHref(partyId, order.quoteId),
                  },
                ]
              : []),
            { label: order.orderNumber },
          ]}
        />
        <PageHeader
          kicker="Pedido"
          title={order.orderNumber}
          description={customerName}
          action={
            <Link href={partyHref(partyId)} className={documentLinkClass}>
              Volver al cliente
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />
        <RecordNextStep
          step={orderNextStep({
            status: order.status,
            partyId,
            orderId: order.orderId,
            customerHref: partyHref(partyId),
          })}
        />

        <PedidoOperatingSummary view={operating} />

        <div className="mt-10">
          <OrderCasePanel
            organizationId={order.organizationId}
            orderId={order.orderId}
            facts={[]}
            releases={[]}
            availability="unavailable"
          />
        </div>

        <PageSection card className="mt-10 bg-white p-8 md:p-10">
          <StatusPill tone={statusTone(order.status)}>
            {formatOrderStatus(order.status)}
          </StatusPill>

          {resultado === 'pedido' ? (
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
              {sourceQuoteNumber
                ? `Pedido creado desde Cotización ${sourceQuoteNumber}`
                : 'Pedido creado desde la cotización'}
              . La relación se conserva. No se emitió factura ni nota de entrega.
            </p>
          ) : (
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {sourceQuoteNumber
                ? `Pedido creado desde Cotización ${sourceQuoteNumber}`
                : 'Pedido registrado desde una cotización'}
              .
            </p>
          )}

          <dl className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Cliente</dt>
              <dd className="mt-2">
                <Link href={partyHref(partyId)} className={documentLinkClass}>
                  {customerName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{ownerLabel}</dd>
            </div>
            {order.quoteId ? (
              <div>
                <dt className="isalwa-section-label">Cotización de origen</dt>
                <dd className="mt-2">
                  <Link href={quoteHref(partyId, order.quoteId)} className={documentLinkClass}>
                    {sourceQuoteNumber ?? 'Ver cotización'}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Total</dt>
              <dd className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
                {formatCentavos(order.totalCentavos, order.currency)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Creado</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatTimestamp(order.createdAt)}</dd>
            </div>
            {order.cancelledAt ? (
              <div>
                <dt className="isalwa-section-label">Cancelado</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatTimestamp(order.cancelledAt)}</dd>
              </div>
            ) : null}
          </dl>
        </PageSection>

        {operating.sections.lines ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <OrderLines currency={order.currency} lines={order.lines} />
          </PageSection>
        ) : null}

        <DeliveryDocumentsPanel
          partyId={partyId}
          orderId={order.orderId}
          orderNumber={order.orderNumber}
          customerName={customerName}
          actorMemberId={actorMemberId}
          orderLines={(order.lines ?? []).map((line) => ({
            orderLineId: line.orderLineId,
            description: line.description,
            quantity: line.quantity,
            unitLabel: line.unitLabel ?? null,
            productRef: line.productRef ?? null,
          }))}
          notes={deliveryNotes}
          timeline={deliveryTimeline}
          canMutate={order.status === 'open' && Boolean(actorMemberId)}
        />

        {order.status === 'open' || approvals.length > 0 ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <SectionHeader
              title={
                <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                  Aprobación
                </h2>
              }
            />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
              La aprobación registra una decisión humana. No cambia el pedido ni crea otro pedido.
            </p>
            <div className="mt-8">
              <CommercialApprovalPanel
                partyId={partyId}
                subjectType="order"
                subjectId={order.orderId}
                canRequest={authority?.canRequestApproval === true}
                memberLabels={approvalMemberLabels}
                approvals={approvals}
              />
            </div>
          </PageSection>
        ) : null}
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Pedido">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró este pedido.' }}
          />
        </PageContainer>
      );
    }
    if (err instanceof OsApiError && err.kind === 'forbidden') {
      return (
        <PageContainer label="Pedido">
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Pedido">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
