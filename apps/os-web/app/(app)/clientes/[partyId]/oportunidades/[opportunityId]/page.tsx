import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { OpportunityActionsPanel } from '@/components/commercial/opportunity-actions-panel';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  formatOpportunityStatus,
  formatStage,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { loadMemberOptionsForAdmin } from '@/lib/commercial/member-options';
import { formatOptionalCentavos } from '@/lib/commercial/money';
import { newQuoteHref, opportunityHref } from '@/lib/commercial/navigation';
import { partyHref } from '@/lib/party/navigation';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type OpportunityDetailPageProps = {
  params: Promise<{ partyId: string; opportunityId: string }>;
};

export default async function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const { partyId, opportunityId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { opportunity, freshness } = await client.getOpportunity(opportunityId);
    const memberLabels = await resolveMemberLabels(client, [opportunity.ownerMemberId]);
    const memberOptions = await loadMemberOptionsForAdmin(client);
    const value = formatOptionalCentavos(opportunity.expectedValueCentavos ?? undefined, 'BOB');
    const isOpen = opportunity.status === 'open';

    return (
      <PageContainer label={opportunity.title}>
        <PageHeader
          kicker="Oportunidad"
          title={opportunity.title}
          action={
            <div className="flex flex-wrap gap-2">
              {isOpen ? (
                <Link href={newQuoteHref(partyId, opportunityId)}>
                  <Button type="button" variant="primary">
                    Nueva cotización
                  </Button>
                </Link>
              ) : null}
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
            <StatusPill tone={statusTone(opportunity.status)}>
              {formatOpportunityStatus(opportunity.status)}
            </StatusPill>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Etapa</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatStage(opportunity.stage)}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, opportunity.ownerMemberId)}
              </dd>
            </div>
            {value ? (
              <div>
                <dt className="isalwa-section-label">Monto estimado</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">{value}</dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Creada</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {formatTimestamp(opportunity.createdAt)}
              </dd>
            </div>
            {opportunity.closedAt ? (
              <div>
                <dt className="isalwa-section-label">Cerrada</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(opportunity.closedAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </PageSection>

        <OpportunityActionsPanel
          partyId={partyId}
          opportunity={opportunity}
          memberOptions={memberOptions}
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
