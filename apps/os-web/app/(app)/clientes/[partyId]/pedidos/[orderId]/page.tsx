import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { CommercialApprovalPanel } from '@/components/commercial/commercial-approval-panel';
import { CommercialPath } from '@/components/commercial/commercial-path';
import { DocumentDossierPanel } from '@/components/commercial/document-dossier-panel';
import { OrderLines } from '@/components/commercial/order-lines';
import { OrderPrepCard } from '@/components/commercial/order-prep-card';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { RecordNextStep } from '@/components/commercial/record-next-step';
import { DeliveryDocumentsPanel } from '@/components/delivery/delivery-documents-panel';
import { ReportIssueTrigger } from '@/components/issue/report-issue-trigger';
import { PedidoDetailHero } from '@/components/operations/pedido-detail-hero';
import { PedidoKnownStateCard } from '@/components/operations/pedido-known-state-card';
import { PedidoLifecycleStrip } from '@/components/operations/pedido-lifecycle-strip';
import { PedidoOpsLaneCards } from '@/components/operations/pedido-ops-lane-cards';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import {
  canRecordDelivery,
  canRecordProduction,
  canRecordPurchasing,
  canRecordWarehouseOutbound,
  canReceiveFinishedGoods,
} from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { composeDocumentDossier } from '@/lib/commercial/document-dossier';
import {
  formatOrderStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { quoteHref } from '@/lib/commercial/navigation';
import { orderNextStep } from '@/lib/commercial/next-step';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { projectPedidoTimeline } from '@/lib/commercial/pedido-timeline';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { reportIssueContextFromOrder } from '@/lib/issue/report-context';
import { formatIssueStatus, statusToneForIssue } from '@/lib/issue/labels';
import type { IssueListItem } from '@/lib/issue/types';
import { buildPedidoKnownState } from '@/lib/operations/pedido-known-state';
import { buildPedidoLifecycle } from '@/lib/operations/pedido-lifecycle';
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

    const capabilities = await loadMemberCapabilities();
    const actorMemberId = capabilities?.memberId?.trim() || null;
    const partyLabels = await resolvePartyLabels(client, [order.partyId]);
    const customerName = partyLabel(partyLabels, order.partyId);
    const memberLabels = await resolveMemberLabels(
      client,
      [order.ownerMemberId, actorMemberId].filter((id): id is string => Boolean(id)),
    );
    const ownerLabel = memberLabel(memberLabels, order.ownerMemberId);
    const reportedByLabel = actorMemberId
      ? memberLabel(memberLabels, actorMemberId)
      : undefined;
    const issueContext = reportIssueContextFromOrder(order.orderId, order.orderNumber, partyId);

    let sourceQuoteNumber: string | null = null;
    let sourceQuote: Awaited<ReturnType<typeof client.getQuote>>['quote'] | null = null;
    if (order.quoteId) {
      try {
        const pack = await client.getQuote(order.quoteId);
        sourceQuote = pack.quote;
        sourceQuoteNumber = pack.quote.quoteNumber;
      } catch {
        sourceQuoteNumber = null;
        sourceQuote = null;
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

    const scopes = capabilities?.grantedScopes ?? [];
    const canMutateDelivery =
      order.status === 'open' &&
      Boolean(actorMemberId) &&
      (canRecordDelivery(scopes) || canRecordWarehouseOutbound(scopes));
    const canCreateNote = order.status === 'open' && Boolean(actorMemberId) && canRecordDelivery(scopes);
    const canRecordSalida =
      order.status === 'open' && Boolean(actorMemberId) && canRecordWarehouseOutbound(scopes);
    const canRecordEntrega =
      order.status === 'open' && Boolean(actorMemberId) && canRecordDelivery(scopes);
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
    let deliveryEvents: Array<{
      id: string;
      eventType: string;
      occurredAt: string;
      payload?: Record<string, unknown>;
      actorMemberId?: string | null;
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
          actorMemberId?: string | null;
        }>;
      }>('/delivery-notes', { orderId: order.orderId });
      deliveryNotes = docs.notes ?? [];
      deliveryEvents = docs.timeline ?? [];
    } catch {
      deliveryNotes = [];
      deliveryEvents = [];
    }

    let partyTimelineItems: Awaited<ReturnType<typeof client.listPartyTimeline>>['items'] = [];
    try {
      const timelinePage = await client.listPartyTimeline(partyId, { limit: 50 });
      partyTimelineItems = timelinePage.items ?? [];
    } catch {
      partyTimelineItems = [];
    }

    let linkedIssues: IssueListItem[] = [];
    try {
      const issuePage = await client.listIssues({ view: 'all', partyId, limit: 20 });
      linkedIssues = (issuePage.items ?? [])
        .map((item) => ({
          issueId: item.issueId,
          title: item.title,
          description: item.description,
          status: item.status,
          reporterMemberId: item.reporterMemberId,
          ownerMemberId: item.ownerMemberId,
          createdAt: item.createdAt,
          references: item.references ?? [],
        }))
        .filter((item) =>
          item.references.some(
            (ref) => ref.referenceType === 'order' && ref.referenceId === order.orderId,
          ),
        );
    } catch {
      linkedIssues = [];
    }

    const pedidoTimeline = projectPedidoTimeline({
      partyId,
      orderId: order.orderId,
      partyTimelineEntries: partyTimelineItems,
      deliveryEvents,
      linkedIssues,
    });

    const deliveryTimeline = pedidoTimeline.map((item) => ({
      id: item.id,
      eventType: item.eventType,
      occurredAt: item.occurredAt,
      label: item.label,
      detail: item.detail,
      href: item.href,
    }));

    const dossierItems = composeDocumentDossier({
      partyId,
      quotes: sourceQuote ? [sourceQuote] : [],
      deliveryNotes,
      timelineEntries: partyTimelineItems,
      quoteIdFilter: order.quoteId,
    });

    let openPrepReviews: ReturnType<typeof findOpenOrderPrepReviews> = {};
    let openWorkCount = 0;
    try {
      const workPage = await client.listWorkItems({ status: 'open', limit: 100 });
      openPrepReviews = findOpenOrderPrepReviews(
        workPage.items ?? [],
        order.orderId,
        partyId,
      );
      openWorkCount = (workPage.items ?? []).filter(
        (row) => row.subjectType === 'party' && row.subjectId === partyId,
      ).length;
    } catch {
      openPrepReviews = {};
      openWorkCount = 0;
    }

    const finishedGoodsEvidence = partyTimelineItems.some((item) => {
      if (item.eventType !== 'finished_goods.received') return false;
      const facts = item.facts ?? {};
      const contextOrderId =
        typeof facts.contextOrderId === 'string'
          ? facts.contextOrderId
          : typeof facts.orderId === 'string'
            ? facts.orderId
            : null;
      return (
        contextOrderId === order.orderId ||
        item.primaryEntityId === order.orderId ||
        (typeof facts.orderNumber === 'string' && facts.orderNumber === order.orderNumber)
      );
    });

    const hasSalidaFact = deliveryEvents.some((e) => e.eventType === 'warehouse_exit.recorded')
      || pedidoTimeline.some((e) => e.eventType === 'warehouse_exit.recorded');
    const hasEntregaFact = deliveryEvents.some((e) => e.eventType === 'customer_delivery.recorded')
      || pedidoTimeline.some((e) => e.eventType === 'customer_delivery.recorded');
    const hasDeliveryNote = deliveryNotes.some((note) => note.status === 'issued');
    const hasOpenPrep = Object.keys(openPrepReviews).length > 0;

    const lifecycle = buildPedidoLifecycle({
      hasSourceQuote: Boolean(order.quoteId),
      orderRecorded: true,
      hasPreparacionFact: hasOpenPrep || finishedGoodsEvidence,
      hasSalidaFact,
      hasEntregaFact,
    });

    const totalLabel = formatCentavos(order.totalCentavos, order.currency);
    const createdAtLabel = formatTimestamp(order.createdAt) ?? '—';
    const nextStep = orderNextStep({
      status: order.status,
      partyId,
      orderId: order.orderId,
      customerHref: partyHref(partyId),
    });

    const knownState = buildPedidoKnownState({
      orderNumber: order.orderNumber,
      customerName,
      ownerLabel,
      statusLabel: formatOrderStatus(order.status),
      sourceQuoteNumber,
      totalLabel,
      createdAtLabel,
      hasOpenPrepReviews: hasOpenPrep,
      finishedGoodsEvidence,
      hasDeliveryNote,
      hasSalida: hasSalidaFact,
      hasEntrega: hasEntregaFact,
      nextSafeAction: nextStep?.statement ?? operating.nextAction,
      whoToAsk: ownerLabel,
    });

    const boundedTimeline = pedidoTimeline.slice(0, 8);
    const boundedDossier = dossierItems.slice(0, 12);

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
            <div className="flex flex-wrap items-center gap-2">
              <ReportIssueTrigger
                context={issueContext}
                reportedByLabel={reportedByLabel}
                variant="secondary"
              />
              <Link href={partyHref(partyId)} className={documentLinkClass}>
                Volver al cliente
              </Link>
            </div>
          }
        />

        <StaleProjectionBanner freshness={freshness} />
        <RecordNextStep step={nextStep} />

        <PedidoDetailHero
          orderNumber={order.orderNumber}
          statusLabel={formatOrderStatus(order.status)}
          statusTone={statusTone(order.status)}
          customerName={customerName}
          customerHref={partyHref(partyId)}
          sourceQuoteNumber={sourceQuoteNumber}
          sourceQuoteHref={order.quoteId ? quoteHref(partyId, order.quoteId) : null}
          totalLabel={totalLabel}
          createdAtLabel={createdAtLabel}
          responsibleLabel={ownerLabel}
        />

        {resultado === 'pedido' ? (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
            {sourceQuoteNumber
              ? `Pedido creado desde Cotización ${sourceQuoteNumber}`
              : 'Pedido creado desde la cotización'}
            . La relación se conserva. No se emitió factura ni nota de entrega.
          </p>
        ) : null}

        <div className="mt-6">
          <PedidoLifecycleStrip steps={lifecycle} />
        </div>

        <PedidoKnownStateCard view={knownState} />

        {actorMemberId ? (
          <OrderPrepCard
            orderId={order.orderId}
            partyId={partyId}
            actorMemberId={actorMemberId}
            orderLabel={order.orderNumber}
            assignees={{
              production: canRecordProduction(scopes) ? actorMemberId : null,
              warehouse:
                canReceiveFinishedGoods(scopes) || canRecordWarehouseOutbound(scopes)
                  ? actorMemberId
                  : null,
              purchasing: canRecordPurchasing(scopes) ? actorMemberId : null,
            }}
            openReviews={openPrepReviews}
            warehouseEvidence={
              finishedGoodsEvidence
                ? 'Hay un ingreso de productos terminados registrado vinculado a este pedido (hecho reportado; no indica stock disponible).'
                : null
            }
            canMutate={order.status === 'open'}
          />
        ) : null}

        <PedidoOpsLaneCards orderId={order.orderId} />

        {operating.sections.lines ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <OrderLines currency={order.currency} lines={order.lines} />
          </PageSection>
        ) : null}

        <details className="mt-10 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-6 md:p-8">
          <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
            Documentos ({boundedDossier.length}
            {dossierItems.length > boundedDossier.length ? ` de ${dossierItems.length}` : ''})
          </summary>
          <div className="mt-6">
            <DocumentDossierPanel partyId={partyId} items={boundedDossier} />
          </div>
        </details>

        <details className="mt-6 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-6 md:p-8">
          <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
            Trabajo vinculado
            {openWorkCount > 0 ? ` (${openWorkCount} abiertos en el cliente)` : ''}
          </summary>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Las revisiones operativas y actualizaciones aparecen en Trabajo. No se inventa un dueño de área.
          </p>
          <Link href="/trabajo" className={`${documentLinkClass} mt-3 inline-block`}>
            Abrir Trabajo
          </Link>
        </details>

        <details className="mt-6 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-6 md:p-8">
          <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
            Historial ({boundedTimeline.length}
            {pedidoTimeline.length > boundedTimeline.length ? ` de ${pedidoTimeline.length}` : ''})
          </summary>
          {boundedTimeline.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--isalwa-slate)]">Sin eventos registrados para este pedido.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {boundedTimeline.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium text-[var(--isalwa-kiln)]">{item.label}</p>
                  <p className="text-[var(--isalwa-slate)]">
                    {formatTimestamp(item.occurredAt) ?? item.occurredAt}
                    {item.detail ? ` · ${item.detail}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </details>

        <div className="mt-10">
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
            canMutate={canMutateDelivery}
            canCreateNote={canCreateNote}
            canRecordSalida={canRecordSalida}
            canRecordEntrega={canRecordEntrega}
          />
        </div>

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

        <PageSection card className="mt-10 bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="isalwa-section-label">Incidencias</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                {linkedIssues.length === 0
                  ? 'Sin incidencias vinculadas a este pedido.'
                  : `${linkedIssues.length} vinculada${linkedIssues.length === 1 ? '' : 's'}.`}
              </p>
            </div>
            <ReportIssueTrigger
              context={issueContext}
              reportedByLabel={reportedByLabel}
              variant="secondary"
            />
          </div>
          {linkedIssues.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {linkedIssues.slice(0, 5).map((issue) => (
                <li key={issue.issueId} className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusPill tone={statusToneForIssue(issue.status)}>
                    {formatIssueStatus(issue.status)}
                  </StatusPill>
                  <span className="text-[var(--isalwa-kiln)]">
                    {issue.title?.trim() || issue.description.slice(0, 80)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </PageSection>
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
