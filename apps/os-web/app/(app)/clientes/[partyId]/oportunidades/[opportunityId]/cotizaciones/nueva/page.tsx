import Link from 'next/link';
import { PageContainer } from '@isalwa/ui';
import { QuoteCreateForm } from '@/components/commercial/quote-create-form';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { opportunityHref } from '@/lib/commercial/navigation';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type NewQuotePageProps = {
  params: Promise<{ partyId: string; opportunityId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewQuotePage({ params, searchParams }: NewQuotePageProps) {
  const { partyId, opportunityId } = await params;
  const dataMode = await resolveDemoDataMode(searchParams);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { opportunity } = await client.getOpportunity(opportunityId);
    if (opportunity.partyId !== partyId) {
      return (
        <PageContainer label="Nueva cotización">
          <QuerySurfaceState error={{ kind: 'unknown', message: 'La oportunidad no pertenece a este cliente.' }} />
        </PageContainer>
      );
    }
    const partyLabels = await resolvePartyLabels(client, [partyId]);
    const customerName = partyLabel(partyLabels, partyId);
    const memberLabels = await resolveMemberLabels(client, [opportunity.ownerMemberId]);
    const ownerLabel = memberLabel(memberLabels, opportunity.ownerMemberId);

    return (
      <PageContainer label="Nueva cotización">
        <PageHeader
          kicker="Cotización"
          title="Crear cotización"
          description={customerName}
          action={
            <Link
              href={opportunityHref(partyId, opportunityId)}
              className="isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline"
            >
              Volver a la oportunidad
            </Link>
          }
        />
        <QuoteCreateForm
          partyId={partyId}
          opportunityId={opportunityId}
          opportunityTitle={opportunity.title}
          customerName={customerName}
          ownerLabel={ownerLabel}
          dataModeLabel={dataMode === 'demo' ? 'Demo' : 'Datos reales'}
        />
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Nueva cotización">
          <QuerySurfaceState error={{ kind: 'unknown', message: 'No se encontró esta oportunidad.' }} />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Nueva cotización">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
