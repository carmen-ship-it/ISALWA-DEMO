import Link from 'next/link';
import { Button, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { CommercialApprovalPanel } from '@/components/commercial/commercial-approval-panel';
import { CommercialPath } from '@/components/commercial/commercial-path';
import { CommercialProgressStrip } from '@/components/commercial/commercial-progress-strip';
import { CommercialStickyBar } from '@/components/commercial/commercial-sticky-bar';
import { ConvertQuoteForm } from '@/components/commercial/convert-quote-form';
import { QuoteDetailActions } from '@/components/commercial/quote-detail-actions';
import { QuoteDocumentoCard } from '@/components/commercial/quote-documento-card';
import { QuoteDocumentActions } from '@/components/commercial/quote-document-actions';
import { QuoteEditor } from '@/components/commercial/quote-editor';
import {
  QuoteBuilderUiProvider,
  QuoteDraftNextStep,
} from '@/components/commercial/quote-builder-ui';
import { QuoteLiveFrame, QuoteLiveLines, QuoteLiveStatus } from '@/components/commercial/quote-live-frame';
import { QuoteEnvioSection } from '@/components/commercial/quote-envio-section';
import { RecordNextStep } from '@/components/commercial/record-next-step';
import { PageHeader } from '@/components/shell/page-header';
import { EventWorkOfferPanel } from '@/components/work/event-work-offer-panel';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { commercialProgressSteps } from '@/lib/commercial/commercial-progress';
import { formatTimestamp } from '@/lib/commercial/labels';
import { canRegisterQuoteFollowUp } from '@/lib/commercial/quote-follow-up';
import { canRecordQuoteManualSend } from '@/lib/commercial/quote-manual-send';
import { findLatestQuoteSendRecord } from '@/lib/commercial/quote-send-status';
import { formatCentavos } from '@/lib/commercial/money';
import { lineProvenanceView } from '@/lib/commercial/product-picker';
import { clienteSectionHref, opportunityHref, orderHref } from '@/lib/commercial/navigation';
import { latestQuoteApprovalDecision, quoteNextStep } from '@/lib/commercial/next-step';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { partyHref } from '@/lib/party/navigation';
import { offerAfterQuoteSent } from '@/lib/work/event-work-offer';
import { memberLabel, resolveMemberLabels, resolveMemberResponsibilityLabels, memberWithCargoLine } from '@/lib/work/member-resolver';
import { commercialOwnerLine } from '@/lib/work/staff-display';
import { approvalResponsibilityView } from '@/lib/work/approval-responsibility';
import { WhoHasTheBallCard } from '@/components/work/who-has-the-ball-card';
import { whoHasTheBallView } from '@/lib/work/who-has-the-ball';
import { classifyQueryError } from '@/lib/work/query-errors';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import {
  evaluationAllowsDesk,
  evaluationBlocksDirectParty,
} from '@/lib/role-preview/evaluation-resource-access';
import { AccessDeniedState } from '@/components/states/app-states';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

type QuoteDetailPageProps = {
  params: Promise<{ partyId: string; quoteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const documentLinkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

const documentTitle = (
  <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
    Líneas
  </h2>
);

export default async function QuoteDetailPage({ params, searchParams }: QuoteDetailPageProps) {
  const { partyId, quoteId } = await params;
  const dataMode = await resolveDemoDataMode(searchParams);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'commercial')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Cotización" />;
  }

  const client = createOsApiClient(auth);

  try {
    const { quote, freshness, authority } = await client.getQuote(quoteId);
    if (evaluationBlocksDirectParty(evaluation, quote.ownerMemberId)) {
      return (
        <PageContainer label="Cotización">
          <AccessDeniedState />
        </PageContainer>
      );
    }
    const partyLabels = await resolvePartyLabels(client, [quote.partyId]);
    const customerName = partyLabel(partyLabels, quote.partyId);
    const ownerResponsibility = await resolveMemberResponsibilityLabels(client, [quote.ownerMemberId]);
    const memberLabels = new Map(
      [...ownerResponsibility.entries()].map(([id, row]) => [id, row.displayName]),
    );
    const ownerRow = ownerResponsibility.get(quote.ownerMemberId);
    const commercialOwnerDisplay = commercialOwnerLine({
      displayName: ownerRow?.displayName ?? null,
      cargoLabel: ownerRow?.businessRoleLabel ?? null,
    });
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
      quote.status === 'accepted'
        ? await (async () => {
            const commercialQuery = commercialListQueryFromProjection(evaluation);
            try {
              return await client.listOrders({
                quoteId: quote.quoteId,
                partyId,
                limit: 5,
                visibility: 'org',
                ...commercialQuery,
              });
            } catch {
              return await client.listOrders({
                quoteId: quote.quoteId,
                partyId,
                limit: 5,
                ...commercialQuery,
              });
            }
          })()
        : null;
    const relatedOrder = relatedOrders?.items[0] ?? null;
    let approvalMemberLabels = new Map<string, string>();
    let approvalResponsibility = new Map<
      string,
      { displayName: string; businessRoleLabel: string | null }
    >();
    let approvals: SubjectApprovalItem[] = [];
    if (quote.status === 'submitted' || quote.status === 'accepted') {
      try {
        const history = await client.listSubjectApprovals('quote', quote.quoteId);
        approvals = history.items as SubjectApprovalItem[];
        const ids = [
          ...new Set(
            approvals.flatMap((row) =>
              [row.approverMemberId, row.requestedByMemberId, row.decisionByMemberId ?? ''].filter(Boolean),
            ),
          ),
        ] as string[];
        approvalResponsibility = await resolveMemberResponsibilityLabels(client, ids);
        approvalMemberLabels = new Map(
          [...approvalResponsibility.entries()].map(([id, row]) => [id, row.displayName]),
        );
      } catch {
        approvalMemberLabels = new Map();
        approvalResponsibility = new Map();
        approvals = [];
      }
    }

    let sendRecord = null as ReturnType<typeof findLatestQuoteSendRecord>;
    let sendActorLabel: string | null = null;
    if (quote.status === 'submitted' || quote.status === 'accepted') {
      try {
        const timeline = await client.listPartyTimeline(partyId, { limit: 50 });
        sendRecord = findLatestQuoteSendRecord(timeline.items, quote.quoteId);
        if (sendRecord?.actorMemberId) {
          const actors = await resolveMemberLabels(client, [sendRecord.actorMemberId]);
          sendActorLabel = memberLabel(actors, sendRecord.actorMemberId);
        }
      } catch {
        sendRecord = null;
      }
    }

    const lines = [...quote.lines].sort((a, b) => a.lineNumber - b.lineNumber);
    const pendingApproval = approvals.find((row) => row.status === 'pending') ?? null;
    const hasPendingApproval = Boolean(pendingApproval);
    const latestApprovalDecision = latestQuoteApprovalDecision(approvals);
    const pendingResponsibility = pendingApproval
      ? approvalResponsibilityView({
          status: 'pending',
          approvalRequestId: pendingApproval.approvalRequestId,
          approver: {
            memberId: pendingApproval.approverMemberId,
            displayName:
              approvalResponsibility.get(pendingApproval.approverMemberId)?.displayName ?? null,
            businessRoleLabel:
              approvalResponsibility.get(pendingApproval.approverMemberId)?.businessRoleLabel ??
              null,
          },
          requesterDisplayName:
            approvalResponsibility.get(pendingApproval.requestedByMemberId)?.displayName ?? null,
        })
      : null;
    const followUpAllowed = canRegisterQuoteFollowUp(quote.status);
    const manualSendAllowed = canRecordQuoteManualSend(quote.status) && !sendRecord;
    const quoteWorkOffer = offerAfterQuoteSent({
      quoteStatus: quote.status,
      partyId: quote.partyId,
      quoteNumber: quote.quoteNumber,
    });
    const rejectedRow = approvals
      .filter((row) => row.status === 'rejected')
      .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))[0];
    const nextStep = quoteNextStep({
      status: quote.status,
      partyId,
      quoteId: quote.quoteId,
      canConvertToOrder: authority?.canConvertToOrder === true,
      relatedOrderHref: relatedOrder ? orderHref(partyId, relatedOrder.orderId) : null,
      relatedOrderLabel: relatedOrder?.orderNumber ?? null,
      hasPendingApproval,
      canRegisterFollowUp: followUpAllowed,
      followUpHref: followUpAllowed ? clienteSectionHref(partyId, 'trabajo') : null,
      sendRecorded: Boolean(sendRecord),
      latestApprovalDecision,
      quoteNumber: quote.quoteNumber,
      rejectedBy: rejectedRow
        ? approvalResponsibility.get(rejectedRow.decisionByMemberId ?? '')?.displayName ?? null
        : null,
      rejectionReason: rejectedRow?.decisionReason ?? null,
      pendingApprovalHeadline: pendingResponsibility?.headline ?? null,
      pendingApprovalHref: pendingResponsibility?.requestHref ?? null,
      lineCount: lines.length,
    });
    const ball = whoHasTheBallView({
      commercialOwner: ownerRow
        ? {
            memberId: quote.ownerMemberId,
            displayName: ownerRow.displayName,
            businessRoleLabel: ownerRow.businessRoleLabel,
          }
        : null,
      temporarySupport: null,
      pendingApproval: pendingApproval
        ? {
            approvalRequestId: pendingApproval.approvalRequestId,
            status: pendingApproval.status,
            approver: {
              memberId: pendingApproval.approverMemberId,
              displayName:
                approvalResponsibility.get(pendingApproval.approverMemberId)?.displayName ?? null,
              businessRoleLabel:
                approvalResponsibility.get(pendingApproval.approverMemberId)?.businessRoleLabel ??
                null,
            },
            requesterDisplayName:
              approvalResponsibility.get(pendingApproval.requestedByMemberId)?.displayName ?? null,
          }
        : null,
      nextStepStatement: nextStep?.statement ?? null,
      nextStepHrefLabel: nextStep?.hrefLabel ?? null,
    });
    const pathCrumbs = [
      { label: customerName, href: partyHref(partyId) },
      ...(quote.opportunityId
        ? [
            {
              label: opportunityTitle ?? 'Oportunidad',
              href: opportunityHref(partyId, quote.opportunityId),
            },
          ]
        : []),
      { label: quote.quoteNumber },
    ];
    const progress = commercialProgressSteps({
      hasQuote: true,
      onQuote: true,
      hasOrder: Boolean(relatedOrder),
    });
    const isDraft = quote.status === 'draft';
    const totalLabel = formatCentavos(quote.totalCentavos, quote.currency);

    const pageBody = (
      <PageContainer label={quote.quoteNumber}>
        <CommercialPath crumbs={pathCrumbs} />
        <CommercialProgressStrip steps={progress} />
        <PageHeader
          kicker="Cotización"
          title={quote.quoteNumber}
          description={customerName}
          action={
            <QuoteDetailActions
              quoteId={quote.quoteId}
              quoteNumber={quote.quoteNumber}
              quoteStatus={quote.status}
              canRecordSend={manualSendAllowed}
              canRegisterFollowUp={followUpAllowed}
              canEdit={isDraft}
              canCancel={isDraft}
              canConvertToOrder={authority?.canConvertToOrder === true}
            />
          }
        />

        <StaleProjectionBanner freshness={freshness} />
        {isDraft ? <QuoteDraftNextStep lineCount={lines.length} /> : <RecordNextStep step={nextStep} />}
        {!isDraft ? (
          <div className="mb-6">
            <QuoteDocumentActions
              quoteId={quote.quoteId}
              quoteNumber={quote.quoteNumber}
              quoteStatus={quote.status}
              canRecordSend={manualSendAllowed}
              sendRecorded={Boolean(sendRecord)}
            />
          </div>
        ) : null}
        {ball.waitingLine ? (
          <WhoHasTheBallCard
            className="mb-6"
            view={ball}
            waiting
          />
        ) : null}

        {authority?.canConvertToOrder ? (
          <CommercialStickyBar className="mb-6">
            {quote.status === 'accepted' ? (
              <p className="text-sm text-[var(--isalwa-slate)]">
                Cliente aceptó · listo para pedido
              </p>
            ) : (
              <div className="text-sm text-[var(--isalwa-slate)]">
                <p>Cotización presentada</p>
                <p>Registre el seguimiento o convierta a pedido cuando corresponda.</p>
              </div>
            )}
            <a href="#convertir-pedido">
              <Button type="button">Convertir a Pedido</Button>
            </a>
          </CommercialStickyBar>
        ) : null}

        <PageSection card className="bg-white p-8 md:p-10">
          <QuoteLiveStatus />

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
              <dt className="isalwa-section-label">Responsable comercial</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {ownerRow
                  ? memberWithCargoLine(ownerResponsibility, quote.ownerMemberId)
                  : commercialOwnerDisplay}
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
                <dt className="isalwa-section-label">Presentada</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatTimestamp(quote.submittedAt)}</dd>
              </div>
            ) : null}
            {quote.cancelledAt ? (
              <div>
                <dt className="isalwa-section-label">Cancelada</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatTimestamp(quote.cancelledAt)}</dd>
              </div>
            ) : null}
            {!isDraft ? (
              <div>
                <dt className="isalwa-section-label">Total</dt>
                <dd
                  className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]"
                  data-quote-total="identity"
                >
                  {totalLabel}
                </dd>
              </div>
            ) : null}
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

        {quote.status === 'cancelled' ? (
          <div className="mt-10">
            <QuoteDocumentoCard
              quoteId={quote.quoteId}
              quoteNumber={quote.quoteNumber}
              quoteStatus={quote.status}
              createdAt={quote.createdAt}
            />
          </div>
        ) : null}

        {quote.status === 'submitted' || sendRecord ? (
          <PageSection card className="mt-10 bg-white p-8 md:p-10">
            <QuoteEnvioSection
              partyId={partyId}
              quoteId={quote.quoteId}
              quoteNumber={quote.quoteNumber}
              canRecordSend={manualSendAllowed}
              sendRecord={sendRecord}
              actorLabel={sendActorLabel}
            />
            {quoteWorkOffer.offered && !sendRecord ? (
              <div className="mt-6">
                <EventWorkOfferPanel offer={quoteWorkOffer} />
              </div>
            ) : null}
          </PageSection>
        ) : null}

        {!isDraft ? (
        <QuoteLiveLines>
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
        </QuoteLiveLines>
        ) : null}

        {authority?.canConvertToOrder ? (
          <PageSection id="convertir-pedido" card className="mt-10 scroll-mt-32 bg-white p-8 md:p-10">
            <SectionHeader
              title={
                <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
                  Pedido
                </h2>
              }
            />
            <div className="mt-6">
              <ConvertQuoteForm
                partyId={partyId}
                quoteId={quote.quoteId}
                quoteNumber={quote.quoteNumber}
                customerName={customerName}
                totalLabel={totalLabel}
                quoteStatus={quote.status}
              />
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
          <PageSection id="aprobacion" card className="mt-10 scroll-mt-32 bg-white p-8 md:p-10">
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
                memberRoleLabels={
                  new Map(
                    [...approvalResponsibility.entries()].map(([id, row]) => [
                      id,
                      row.businessRoleLabel,
                    ]),
                  )
                }
                approvals={approvals}
              />
            </div>
          </PageSection>
        ) : null}

        <div id="editar-cotizacion" className="scroll-mt-32">
          <QuoteEditor partyId={partyId} quote={quote} demoPrices={dataMode === 'demo'} />
        </div>
      </PageContainer>
    );

    return (
      <QuoteLiveFrame quote={quote}>
        {isDraft ? <QuoteBuilderUiProvider>{pageBody}</QuoteBuilderUiProvider> : pageBody}
      </QuoteLiveFrame>
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
