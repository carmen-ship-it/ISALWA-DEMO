import Link from 'next/link';
import { PageContainer } from '@isalwa/ui';
import { QuoteCreateForm } from '@/components/commercial/quote-create-form';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { opportunityHref } from '@/lib/commercial/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

type NewQuotePageProps = {
  params: Promise<{ partyId: string; opportunityId: string }>;
};

export default async function NewQuotePage({ params }: NewQuotePageProps) {
  const { partyId, opportunityId } = await params;
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

    return (
      <PageContainer label="Nueva cotización">
        <PageHeader
          kicker="Cotización"
          title="Nueva cotización"
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
