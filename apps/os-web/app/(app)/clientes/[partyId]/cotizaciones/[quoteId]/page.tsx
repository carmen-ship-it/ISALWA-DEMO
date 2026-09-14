import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
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
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import {
  formatQuoteStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { canRegisterQuoteFollowUp } from '@/lib/commercial/quote-follow-up';
import { formatCentavos } from '@/lib/commercial/money';
import { lineProvenanceView } from '@/lib/commercial/product-picker';
import { opportunityHref, orderHref } from '@/lib/commercial/navigation';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { partyHref } from '@/lib/party/navigation';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type QuoteDetailPageProps = {
  params: Promise<{ partyId: string; quoteId: string }>;
};

const documentLinkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

const documentTitle = (
  <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
    Líneas
  </h2>
);

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { partyId, quoteId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { quote, freshness, authority } = await client.getQuote(quoteId);
    const partyLabels = await resolvePartyLabels(client, [quote.partyId]);
    const customerName = partyLabel(partyLabels, quote.partyId);
    const memberLabels = await resolveMemberLabels(client, [quote.ownerMemberId]);
    let opportunityTitle: string | null = null;
    if (quote.opportunityId) {
      try {
        const { opportunity } = await client.getOpportunity(quote.opportunityId);
        opportunityTitle = opportunity.title;
      } catch {
        opportunityTitle = null;
      }
    }
    const relatedOrders =
      quote.status === 'accepted' ? await client.listOrders({ quoteId: quote.quoteId, partyId, limit: 5 }) : null;
    const relatedOrder = relatedOrders?.items[0] ?? null;
    let approvalMemberLabels = new Map<string, string>();
    let approvals: SubjectApprovalItem[] = [];
    if (quote.status === 'submitted' || quote.status === 'accepted') {
      try {
        const history = await client.listSubjectApprovals('quote', quote.quoteId);
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
    const lines = [...quote.lines].sort((a, b) => a.lineNumber - b.lineNumber);

    return (
      <PageContainer label={quote.quoteNumber}>
        <PageHeader
          kicker="Cotización"
          title={quote.quoteNumber}
          description={customerName}
          action={
            <Link href={partyHref(partyId)} className={documentLinkClass}>
              Volver al cliente
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="bg-white p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <StatusPill tone={statusTone(quote.status)} data-tour={TOUR_TARGET.quoteStatus}>
              {formatQuoteStatus(quote.status)}
            </StatusPill>
            <QuotePdfDownloadButton quoteId={quote.quoteId} quoteNumber={quote.quoteNumber} />
          </div>

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
                {memberLabel(memberLabels, quote.ownerMemberId)}
              </dd>
            </div>
            {quote.opportunityId ? (
              <div>
                <dt className="isalwa-section-label">Oportunidad</dt>
                <dd className="mt-2">
                  <Link href={opportunityHref(partyId, quote.opportunityId)} className={documentLinkClass}>
                    {opportunityTitle ?? 'Ver oportunidad'}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Creada</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatTimestamp(quote.createdAt)}</dd>
            </div>
            {quote.submittedAt ? (
              <div>
                <dt className="isalwa-section-label">Enviada</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatTimestamp(quote.submittedAt)}</dd>
              </div>
            ) : null}
            {quote.cancelledAt ? (
              <div>
                <dt className="isalwa-section-label">Cancelada</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatTimestamp(quote.cancelledAt)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Total</dt>
              <dd className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
                {formatCentavos(quote.totalCentavos, quote.currency)}
              </dd>
            </div>
          </dl>

          {quote.notes ? (
            <div className="mt-10 border-t border-[var(--isalwa-mist)] pt-8">
              <p className="isalwa-section-label">Notas</p>
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-[var(--isalwa-kiln)]">
                {quote.notes}
              </p>
            </div>
          ) : null}
        </PageSection>

        <PageSection card className="mt-10 bg-white p-8 md:p-10">
          <SectionHeader title={documentTitle} />
          {lines.length > 0 ? (
            <>
              <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Líneas de cotización">
                {lines.map((line) => {
                  const provenance = lineProvenanceView(line.productRef);
                  return (
                    <li key={line.quoteLineId} className="py-6 first:pt-2">
                    <p className="whitespace-pre-wrap font-medium text-[var(--isalwa-kiln)]">{line.description}</p>
                    {provenance.caption ? (
                      <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{provenance.caption}</p>
                    ) : null}
                    {provenance.note ? (
                      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{provenance.note}</p>
                    ) : null}
                    <dl className="mt-4 grid gap-4 text-sm text-[var(--isalwa-slate)] sm:grid-cols-3">
                      <div>
                        <dt className="isalwa-section-label">Cantidad</dt>
                        <dd className="mt-1 text-[var(--isalwa-kiln)]">
                          {line.quantity}
                          {line.unitLabel ? ` ${line.unitLabel}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="isalwa-section-label">{provenance.priceLabel}</dt>
                        <dd className="mt-1 text-[var(--isalwa-kiln)]">
                          {formatCentavos(line.unitPriceCentavos, quote.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="isalwa-section-label">Total línea</dt>
                        <dd className="mt-1 text-[var(--isalwa-kiln)]">
                          {formatCentavos(line.lineTotalCentavos, quote.currency)}
                        </dd>
                      </div>
                      {line.discountCentavos !== '0' ? (
                        <div>
                          <dt className="isalwa-section-label">Descuento</dt>
                          <dd className="mt-1 text-[var(--isalwa-kiln)]">
                            {formatCentavos(line.discountCentavos, quote.currency)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-8 grid gap-6 border-t border-[var(--isalwa-mist)] pt-8 text-sm sm:grid-cols-3">
                <div>
                  <dt className="isalwa-section-label">Subtotal</dt>
                  <dd className="mt-2 text-[var(--isalwa-kiln)]">
                    {formatCentavos(quote.subtotalCentavos, quote.currency)}
                  </dd>
                </div>
                {quote.headerDiscountCentavos !== '0' ? (
                  <div>
                    <dt className="isalwa-section-label">Descuento</dt>
                    <dd className="mt-2 text-[var(--isalwa-kiln)]">
                      {formatCentavos(quote.headerDiscountCentavos, quote.currency)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="isalwa-section-label">Total</dt>
                  <dd className="mt-2 font-medium text-[var(--isalwa-kiln)]">
                    {formatCentavos(quote.totalCentavos, quote.currency)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Esta cotización no tiene líneas.
            </p>
          )}
        </PageSection>

        {canRegisterQuoteFollowUp(quote.status) ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <SectionHeader title={FOLLOW_UP_COPY.section} />
            <div className="mt-6">
              <RegisterFollowUpForm partyId={quote.partyId} quoteId={quote.quoteId} />
            </div>
          </PageSection>
        ) : null}

        {authority?.canConvertToOrder ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <SectionHeader
              title={
                <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                  Pedido
                </h2>
              }
            />
            <div className="mt-6">
              <ConvertQuoteForm partyId={partyId} quoteId={quote.quoteId} />
            </div>
          </PageSection>
        ) : null}

        {relatedOrder ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <SectionHeader
              title={
                <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                  Pedido
                </h2>
              }
            />
            <p className="mt-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Esta cotización ya tiene un pedido. La relación se conserva.
            </p>
            <Link href={orderHref(partyId, relatedOrder.orderId)} className={`mt-6 inline-flex ${documentLinkClass}`}>
              Ver {relatedOrder.orderNumber}
            </Link>
          </PageSection>
        ) : null}

        {quote.status === 'submitted' || approvals.length > 0 ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <SectionHeader
              title={
                <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                  Aprobación
                </h2>
              }
            />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
              La aprobación registra una decisión humana. No convierte la cotización ni cambia el precio.
            </p>
            <div className="mt-8">
              <CommercialApprovalPanel
                partyId={partyId}
                subjectType="quote"
                subjectId={quote.quoteId}
                canRequest={authority?.canRequestApproval === true}
                memberLabels={approvalMemberLabels}
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
