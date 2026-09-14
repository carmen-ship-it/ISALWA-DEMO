import Link from 'next/link';
import { PageContainer, SectionHeader, StatusPill } from '@isalwa/ui';
import { CommercialApprovalPanel } from '@/components/commercial/commercial-approval-panel';
import { OrderLines } from '@/components/commercial/order-lines';
import { OrderCasePanel } from '@/components/operations/order-case-panel';
import { PedidoCaseSections } from '@/components/operations/pedido-case-sections';
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
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { partyHref } from '@/lib/party/navigation';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import {
  buildPedidoCaseFile,
  pedidoGrantedScopesFromSession,
  timelineEntriesForPedido,
  type FactLoad,
  type PedidoHistoryEntry,
} from '@/lib/operations/pedido-case-file';

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

    // Agent 0 wire: pass loadMemberCapabilities from
    // apps/os-web/lib/auth/member-capabilities.ts (Worker B). Do not invent it.
    // A missing list stays null and scope-gated sections fail closed.
    const grantedScopes = pedidoGrantedScopesFromSession(null);
    const actorMemberId = auth.mode === 'dev' ? auth.session.memberId : null;
    const unavailableFacts = {
      grants: { status: 'unavailable' as const },
      customerDate: { status: 'unavailable' as const },
      productionDate: { status: 'unavailable' as const },
      classification: { status: 'unavailable' as const },
      issues: { status: 'unavailable' as const },
      informed: { status: 'unavailable' as const },
      allocations: { status: 'unavailable' as const },
      deliveries: { status: 'unavailable' as const },
      warehouseExits: { status: 'unavailable' as const },
      receipts: { status: 'unavailable' as const },
    };
    const orderSnapshot = {
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
    };
    const accessProbe = buildPedidoCaseFile({
      order: orderSnapshot,
      actorMemberId,
      grantedScopes,
      asOf: new Date(),
      ...unavailableFacts,
    });

    let quoteNumber: FactLoad<string | null> = order.quoteId
      ? { status: 'unavailable' }
      : { status: 'empty' };
    if (accessProbe.gates.comercial === 'open' && order.quoteId) {
      try {
        const { quote } = await client.getQuote(order.quoteId);
        quoteNumber = quote.quoteNumber?.trim()
          ? { status: 'loaded', value: quote.quoteNumber }
          : { status: 'unavailable' };
      } catch {
        quoteNumber = { status: 'unavailable' };
      }
    }

    let history: FactLoad<PedidoHistoryEntry[]> = { status: 'unavailable' };
    if (accessProbe.gates.historial === 'open') {
      try {
        const timeline = await client.listPartyTimeline(order.partyId);
        const entries = timelineEntriesForPedido(timeline.items, order.organizationId, order.orderId);
        history = entries.length > 0 ? { status: 'loaded', value: entries } : { status: 'empty' };
      } catch {
        history = { status: 'unavailable' };
      }
    }

    let approvalMembers: Array<{ memberId: string; displayName: string }> = [];
    let approvals: SubjectApprovalItem[] = [];
    if (accessProbe.gates.comercial === 'open' && order.status === 'open') {
      try {
        const [members, approvalHistory] = await Promise.all([
          client.listActiveMemberOptions(),
          client.listSubjectApprovals('order', order.orderId),
        ]);
        approvalMembers = members.items;
        approvals = approvalHistory.items as SubjectApprovalItem[];
      } catch {
        approvalMembers = [];
        approvals = [];
      }
    }

    const linesLoaded: FactLoad<number> =
      order.lines == null
        ? { status: 'unavailable' }
        : order.lines.length === 0
          ? { status: 'empty' }
          : { status: 'loaded', value: order.lines.length };

    const file = buildPedidoCaseFile({
      order: orderSnapshot,
      actorMemberId,
      grantedScopes,
      asOf: new Date(),
      ...unavailableFacts,
      history,
      quoteNumber,
      linesLoaded,
      totalLabel: formatCentavos(order.totalCentavos, order.currency),
      statusLabel: formatOrderStatus(order.status),
    });

    const comercialOpen = file.gates.comercial === 'open';
    const evidenciaOpen = file.gates.evidencia === 'open';
    const showApproval =
      comercialOpen && (authority?.canRequestApproval === true || approvals.length > 0);

    return (
      <PageContainer label={order.orderNumber}>
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

        <PedidoOperatingSummary file={file} />

        {resultado === 'pedido' ? (
          <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
            Pedido creado desde la cotización. La relación se conserva. No se emitió factura ni nota de entrega.
          </p>
        ) : null}

        <PedidoCaseSections
          file={file}
          slots={{
            comercial: comercialOpen ? (
              <div className="grid gap-8">
                <StatusPill tone={statusTone(order.status)}>{formatOrderStatus(order.status)}</StatusPill>
                <dl className="grid gap-8 sm:grid-cols-2">
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
                    <dd className="mt-2 text-sm text-[var(--isalwa-kiln)]">{ownerLabel}</dd>
                  </div>
                  {order.quoteId ? (
                    <div>
                      <dt className="isalwa-section-label">Cotización de origen</dt>
                      <dd className="mt-2">
                        <Link href={quoteHref(partyId, order.quoteId)} className={documentLinkClass}>
                          {quoteNumber.status === 'loaded' && quoteNumber.value
                            ? quoteNumber.value
                            : 'Ver cotización'}
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
                    <dd className="mt-2 text-sm text-[var(--isalwa-kiln)]">{formatTimestamp(order.createdAt)}</dd>
                  </div>
                </dl>
                {linesLoaded.status === 'loaded' ? (
                  <OrderLines currency={order.currency} lines={order.lines ?? []} />
                ) : null}
                {showApproval ? (
                  <div>
                    <SectionHeader
                      title={
                        <h3 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                          Aprobación
                        </h3>
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
                        members={approvalMembers}
                        approvals={approvals}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null,
            evidencia: evidenciaOpen ? (
              <OrderCasePanel
                organizationId={order.organizationId}
                orderId={order.orderId}
                facts={[]}
                releases={[]}
                availability="unavailable"
              />
            ) : null,
          }}
        />
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
