import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { CommercialApprovalPanel } from '@/components/commercial/commercial-approval-panel';
import { PageHeader } from '@/components/shell/page-header';
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
    const partyLabels = await resolvePartyLabels(client, [order.partyId]);
    const customerName = partyLabel(partyLabels, order.partyId);
    const memberLabels = await resolveMemberLabels(client, [order.ownerMemberId]);
    let sourceQuoteNumber: string | null = null;
    if (order.quoteId) {
      try {
        const { quote } = await client.getQuote(order.quoteId);
        sourceQuoteNumber = quote.quoteNumber;
      } catch {
        sourceQuoteNumber = null;
      }
    }
    let approvalMembers: Array<{ memberId: string; displayName: string }> = [];
    let approvals: SubjectApprovalItem[] = [];
    if (order.status === 'open') {
      try {
        const [members, history] = await Promise.all([
          client.listActiveMemberOptions(),
          client.listSubjectApprovals('order', order.orderId),
        ]);
        approvalMembers = members.items;
        approvals = history.items as SubjectApprovalItem[];
      } catch {
        approvalMembers = [];
        approvals = [];
      }
    }

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

        <PageSection card className="bg-white p-8 md:p-10">
          <StatusPill tone={statusTone(order.status)}>
            {formatOrderStatus(order.status)}
          </StatusPill>

          {resultado === 'pedido' ? (
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
              Pedido creado desde la cotización. La relación se conserva. No se emitió factura ni nota de entrega.
            </p>
          ) : (
            <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Pedido registrado desde una cotización.
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
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, order.ownerMemberId)}
              </dd>
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
                members={approvalMembers}
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
    return (
      <PageContainer label="Pedido">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
