import { EmptyState, PageContainer, PageSection, SectionHeader, StatGroup, StatusPill } from '@isalwa/ui';
import { CommitmentList } from '@/components/commitments/commitment-list';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient, type CommitmentSummary } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { bucketCompromisosDesk } from '@/lib/commitments/desk-buckets';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';

/**
 * Compromisos desk — due soon / team / completed density from recorded facts.
 */
export default async function CompromisosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const dataMode = await resolveDemoDataMode(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const [openResult, fulfilledResult] = await Promise.all([
      client.listCommitments({ lifecycle: 'open' }),
      client.listCommitments({ lifecycle: 'fulfilled' }),
    ]);
    const raw = [...(openResult.items ?? []), ...(fulfilledResult.items ?? [])];
    const partyLabels = await resolvePartyLabels(
      client,
      raw.map((item) => item.partyId).filter((id): id is string => Boolean(id)),
    );
    const items = filterByDemoDataMode(raw, dataMode, (item) => {
      if (item.partyId) return isDemoDisplayName(partyLabel(partyLabels, item.partyId));
      return /\bDEMO\b|\[is_demo\]/i.test(item.text ?? '');
    });
    const buckets = bucketCompromisosDesk(items);
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
          description="Promesas registradas en la empresa. Un compromiso del cliente no confirma un pago."
          action={
            buckets.openAll.length > 0 ? (
              <StatusPill tone="warning">
                {buckets.openAll.length === 1 ? '1 abierto' : `${buckets.openAll.length} abiertos`}
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Sin abiertos</StatusPill>
            )
          }
        />

        <StatGroup
          className="mb-6"
          items={[
            { label: 'Vence pronto', value: String(buckets.dueSoon.length) },
            { label: 'Equipo', value: String(buckets.team.length) },
            { label: 'Cumplidos', value: String(buckets.completed.length) },
          ]}
        />

        <CommitmentBucketSection
          kicker="Próximos"
          title="Vence pronto"
          items={buckets.dueSoon}
          memberLabels={memberLabels}
          emptyTitle="Sin compromisos próximos"
          emptyDescription="No hay compromisos abiertos con vencimiento cercano."
        />
        <CommitmentBucketSection
          kicker="Equipo"
          title="Compromisos de equipo"
          items={buckets.team}
          memberLabels={memberLabels}
          emptyTitle="Sin compromisos internos"
          emptyDescription="Los compromisos sin cliente vinculado aparecen aquí."
        />
        <CommitmentBucketSection
          kicker="Historial"
          title="Cumplidos"
          items={buckets.completed}
          memberLabels={memberLabels}
          emptyTitle="Sin compromisos cumplidos"
          emptyDescription="Cuando se marquen como cumplidos, aparecerán aquí."
        />
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

function CommitmentBucketSection({
  kicker,
  title,
  items,
  memberLabels,
  emptyTitle,
  emptyDescription,
}: {
  kicker: string;
  title: string;
  items: CommitmentSummary[];
  memberLabels: Awaited<ReturnType<typeof resolveMemberLabels>>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <PageSection card className="mb-6 p-6 md:p-8">
      <SectionHeader
        kicker={kicker}
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {title}
          </h2>
        }
      />
      <div className="mt-4">
        <CommitmentList
          items={items}
          memberLabels={memberLabels}
          showOrigin
          scale
          hideHeader
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>
    </PageSection>
  );
}
