import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { CommercialPath } from '@/components/commercial/commercial-path';
import { CommercialStickyBar } from '@/components/commercial/commercial-sticky-bar';
import { OpportunityActionsPanel } from '@/components/commercial/opportunity-actions-panel';
import { RecordNextStep } from '@/components/commercial/record-next-step';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  formatOpportunityStatus,
  formatTimestamp,
  presentStage,
  statusTone,
} from '@/lib/commercial/labels';
import { formatOptionalCentavos } from '@/lib/commercial/money';
import { newQuoteHref } from '@/lib/commercial/navigation';
import { opportunityNextStep } from '@/lib/commercial/next-step';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { partyHref } from '@/lib/party/navigation';
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
    const nextStep = opportunityNextStep({
      status: opportunity.status,
      partyId,
      opportunityId,
      newQuoteHref: createQuoteHref,
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
          <div className="flex flex-wrap items-center justify-between gap-6">
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
          </dl>
        </PageSection>

        {isOpen ? (
          <CommercialStickyBar className="mt-6">
            <p className="text-sm text-[var(--isalwa-slate)]">Oportunidad abierta</p>
            <Link href={createQuoteHref}>
              <Button type="button" variant="primary">
                Nueva cotización
              </Button>
            </Link>
          </CommercialStickyBar>
        ) : null}

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
