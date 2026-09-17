import { EmptyState, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { CommitmentList } from '@/components/commitments/commitment-list';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveMemberLabels } from '@/lib/work/member-resolver';

/**
 * Compromisos desk — open commitments for the signed-in org.
 * Nav previously pointed at /inicio; this is the real destination.
 */
export default async function CompromisosPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const result = await client.listCommitments({ lifecycle: 'open' });
    const items = result.items ?? [];
    const memberLabels = await resolveMemberLabels(
      client,
      items.flatMap((item) =>
        [item.ownerMemberId, item.createdByMemberId, item.fulfilledByMemberId].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    );

    return (
      <PageContainer label={COMMITMENT_COPY.title}>
        <PageHeader
          kicker="Trabajo"
          title={COMMITMENT_COPY.title}
          description="Promesas abiertas registradas en la empresa. Un compromiso del cliente no confirma un pago."
          action={
            items.length > 0 ? (
              <StatusPill tone="warning">
                {items.length === 1 ? '1 abierto' : `${items.length} abiertos`}
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Sin abiertos</StatusPill>
            )
          }
        />

        <PageSection card className="p-6 md:p-8">
          <CommitmentList
            items={items}
            memberLabels={memberLabels}
            showOrigin
            scale
            hideHeader
            emptyTitle="Sin compromisos abiertos"
            emptyDescription="Cuando se registren compromisos abiertos, aparecerán aquí."
          />
        </PageSection>
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label={COMMITMENT_COPY.title}>
        <PageHeader kicker="Trabajo" title={COMMITMENT_COPY.title} />
        <QuerySurfaceState error={classifyQueryError(err)} />
        <EmptyState
          title="No se pudieron cargar los compromisos"
          description="Intente de nuevo más tarde. No se inventaron registros."
        />
      </PageContainer>
    );
  }
}
