import Link from 'next/link';
import { Button, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { CommercialApprovalPanel } from '@/components/commercial/commercial-approval-panel';
import { ConvertQuoteForm } from '@/components/commercial/convert-quote-form';
import { QuoteEditor } from '@/components/commercial/quote-editor';
import { QuotePdfDownloadButton } from '@/components/commercial/quote-pdf-download-button';
import { PageHeader } from '@/components/shell/page-header';
import { RegisterFollowUpForm } from '@/components/work/register-follow-up-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  formatQuoteStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { canRegisterQuoteFollowUp } from '@/lib/commercial/quote-follow-up';
import { formatCentavos } from '@/lib/commercial/money';
import { orderHref } from '@/lib/commercial/navigation';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { partyHref } from '@/lib/party/navigation';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type QuoteDetailPageProps = {
  params: Promise<{ partyId: string; quoteId: string }>;
};

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { partyId, quoteId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { quote, freshness, authority } = await client.getQuote(quoteId);
    const memberLabels = await resolveMemberLabels(client, [quote.ownerMemberId]);
    const relatedOrders =
      quote.status === 'accepted' ? await client.listOrders({ quoteId: quote.quoteId, partyId, limit: 5 }) : null;
    const relatedOrder = relatedOrders?.items[0] ?? null;
    let approvalMembers: Array<{ memberId: string; displayName: string }> = [];
    let approvals: SubjectApprovalItem[] = [];
    if (quote.status === 'submitted' || quote.status === 'accepted') {
      try {
        const [members, history] = await Promise.all([
          client.listActiveMemberOptions(),
          client.listSubjectApprovals('quote', quote.quoteId),
        ]);
        approvalMembers = members.items;
        approvals = history.items as SubjectApprovalItem[];
      } catch {
        approvalMembers = [];
        approvals = [];
      }
    }

    return (
      <PageContainer label={quote.quoteNumber}>
        <PageHeader
          kicker="Cotización"
          title={quote.quoteNumber}
          action={
            <div className="flex flex-wrap items-start justify-end gap-3">
              <QuotePdfDownloadButton quoteId={quote.quoteId} quoteNumber={quote.quoteNumber} />
              <Link href={partyHref(partyId)}>
                <Button type="button" variant="secondary">
                  Volver al cliente
                </Button>
              </Link>
            </div>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusTone(quote.status)}>
              {formatQuoteStatus(quote.status)}
            </StatusPill>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Total</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {formatCentavos(quote.totalCentavos, quote.currency)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, quote.ownerMemberId)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Creada</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatTimestamp(quote.createdAt)}</dd>
            </div>
            {quote.submittedAt ? (
              <div>
                <dt className="isalwa-section-label">Enviada</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(quote.submittedAt)}
                </dd>
              </div>
            ) : null}
            {quote.cancelledAt ? (
              <div>
                <dt className="isalwa-section-label">Cancelada</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(quote.cancelledAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </PageSection>

        {canRegisterQuoteFollowUp(quote.status) ? (
          <PageSection card className="mt-6 p-6">
            <SectionHeader title={FOLLOW_UP_COPY.section} />
            <div className="mt-4">
              <RegisterFollowUpForm partyId={quote.partyId} quoteId={quote.quoteId} />
            </div>
          </PageSection>
        ) : null}

        {authority?.canConvertToOrder ? (
          <PageSection card className="mt-6 p-6">
            <SectionHeader title="Pedido" />
            <div className="mt-4">
              <ConvertQuoteForm partyId={partyId} quoteId={quote.quoteId} />
            </div>
          </PageSection>
        ) : null}

        {relatedOrder ? (
          <PageSection card className="mt-6 p-6">
            <SectionHeader title="Pedido" />
            <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
              Esta cotización ya tiene un pedido. La relación se conserva.
            </p>
            <Link
              href={orderHref(partyId, relatedOrder.orderId)}
              className="mt-4 inline-flex text-sm font-medium text-[var(--isalwa-kiln)] underline"
            >
              Ver {relatedOrder.orderNumber}
            </Link>
          </PageSection>
        ) : null}

        {quote.status === 'submitted' || approvals.length > 0 ? (
          <PageSection card className="mt-6 p-6">
            <SectionHeader title="Aprobación" />
            <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
              La aprobación registra una decisión humana. No convierte la cotización ni cambia el precio.
            </p>
            <div className="mt-4">
              <CommercialApprovalPanel
                partyId={partyId}
                subjectType="quote"
                subjectId={quote.quoteId}
                canRequest={authority?.canRequestApproval === true}
                members={approvalMembers}
                approvals={approvals}
              />
            </div>
          </PageSection>
        ) : null}

        <QuoteEditor partyId={partyId} quote={quote} />
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Cotización">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró esta cotización.' }}
          />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Cotización">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
