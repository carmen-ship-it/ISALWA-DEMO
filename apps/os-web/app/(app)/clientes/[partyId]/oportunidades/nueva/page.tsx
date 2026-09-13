import Link from 'next/link';
import { Button, PageContainer } from '@isalwa/ui';
import { OpportunityCreateForm } from '@/components/commercial/opportunity-create-form';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberOptionsForAdmin } from '@/lib/commercial/member-options';
import { partyHref } from '@/lib/party/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

type NewOpportunityPageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function NewOpportunityPage({ params }: NewOpportunityPageProps) {
  const { partyId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { party } = await client.getParty(partyId);
    const memberOptions = await loadMemberOptionsForAdmin(client);

    return (
      <PageContainer label="Nueva oportunidad">
        <PageHeader
          kicker="Oportunidad"
          title="Nueva oportunidad"
          description={party.displayName}
          action={
            <Link href={partyHref(partyId)}>
              <Button type="button" variant="secondary">
                Volver al cliente
              </Button>
            </Link>
          }
        />
        <OpportunityCreateForm partyId={partyId} memberOptions={memberOptions} />
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Nueva oportunidad">
          <QuerySurfaceState error={{ kind: 'unknown', message: 'No se encontró este cliente.' }} />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Nueva oportunidad">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
