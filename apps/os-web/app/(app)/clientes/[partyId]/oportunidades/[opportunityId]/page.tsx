import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { CommercialPath } from '@/components/commercial/commercial-path';
import { CommercialProgressStrip } from '@/components/commercial/commercial-progress-strip';
import { OpportunityActionsPanel } from '@/components/commercial/opportunity-actions-panel';
import { RecordNextStep } from '@/components/commercial/record-next-step';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { commercialProgressSteps } from '@/lib/commercial/commercial-progress';
import {
  formatOpportunityStatus,
  formatTimestamp,
  presentStage,
  statusTone,
} from '@/lib/commercial/labels';
import { formatOptionalCentavos } from '@/lib/commercial/money';
import { selectLinkedQuote } from '@/lib/commercial/linked-quote';
import { newQuoteHref, quoteHref } from '@/lib/commercial/navigation';
import { opportunityNextStep } from '@/lib/commercial/next-step';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { partyHref } from '@/lib/party/navigation';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type OpportunityDetailPageProps = {
  params: Promise<{ partyId: string; opportunityId: string }>;
};

const documentLinkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

export default async function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const { partyId, opportunityId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { opportunity, freshness } = await client.getOpportunity(opportunityId);
    const partyLabels = await resolvePartyLabels(client, [opportunity.partyId]);
    const customerName = partyLabel(partyLabels, opportunity.partyId);
    const memberLabels = await resolveMemberLabels(client, [opportunity.ownerMemberId]);
    const value = formatOptionalCentavos(opportunity.expectedValueCentavos ?? undefined, 'BOB');
    const isOpen = opportunity.status === 'open';
    const createQuoteHref = newQuoteHref(partyId, opportunityId);

    let linkedQuote: {
      quoteId: string;
      quoteNumber: string;
      status: string | null;
    } | null = null;
    try {
      const evaluation = await getEvaluationProjection();
      const quotes = await client.listQuotes({
        partyId,
        opportunityId,
        limit: 10,
        ...(evaluation.active
          ? commercialListQueryFromProjection(evaluation)
          : { visibility: 'org' }),
      });
      const preferred = selectLinkedQuote(quotes.items, opportunityId);
      if (preferred && preferred.opportunityId === opportunityId) {
        linkedQuote = {
          quoteId: preferred.quoteId,
          quoteNumber: preferred.quoteNumber,
          status: preferred.status,
        };
      }
    } catch {
      linkedQuote = null;
    }

    const linkedHref = linkedQuote ? quoteHref(partyId, linkedQuote.quoteId) : null;
    const nextStep = opportunityNextStep({
      status: opportunity.status,
      partyId,
      opportunityId,
      newQuoteHref: createQuoteHref,
      linkedQuoteHref: linkedHref,
      linkedQuoteStatus: linkedQuote?.status ?? null,
      linkedQuoteNumber: linkedQuote?.quoteNumber ?? null,
    });
    const progress = commercialProgressSteps({
      hasQuote: Boolean(linkedQuote),
      onQuote: false,
    });

    return (
      <PageContainer label={opportunity.title}>
        <CommercialPath
          crumbs={[
            { label: customerName, href: partyHref(partyId) },
            { label: 'Oportunidad' },
            { label: opportunity.title },
          ]}
        />
        <CommercialProgressStrip steps={progress} />
        <PageHeader
          kicker="Oportunidad"
          title={opportunity.title}
          description={customerName}
          action={
            <Link href={partyHref(partyId)} className={documentLinkClass}>
              Volver al cliente
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />
        <RecordNextStep step={nextStep} />

        <PageSection card className="bg-white p-8 md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone={statusTone(opportunity.status)}>
              {formatOpportunityStatus(opportunity.status)}
            </StatusPill>
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
              <dt className="isalwa-section-label">Qué necesita</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{opportunity.title}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Etapa</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{presentStage(opportunity.stage)}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, opportunity.ownerMemberId)}
              </dd>
            </div>
            {value ? (
              <div>
                <dt className="isalwa-section-label">Monto estimado</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{value}</dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Creada</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {formatTimestamp(opportunity.createdAt)}
              </dd>
            </div>
            {opportunity.closedAt ? (
              <div>
                <dt className="isalwa-section-label">Cerrada</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(opportunity.closedAt)}
                </dd>
              </div>
            ) : null}
            {linkedQuote ? (
              <div>
                <dt className="isalwa-section-label">Cotización</dt>
                <dd className="mt-2">
                  <Link href={quoteHref(partyId, linkedQuote.quoteId)} className={documentLinkClass}>
                    {linkedQuote.quoteNumber}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          {isOpen && linkedQuote ? (
            <p className="mt-8">
              <Link href={createQuoteHref}>
                <Button type="button" variant="secondary">
                  Crear otra cotización
                </Button>
              </Link>
            </p>
          ) : null}
        </PageSection>

        <OpportunityActionsPanel
          partyId={partyId}
          opportunity={opportunity}
          currentOwnerLabel={memberLabel(memberLabels, opportunity.ownerMemberId)}
        />
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Oportunidad">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró esta oportunidad.' }}
          />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Oportunidad">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
