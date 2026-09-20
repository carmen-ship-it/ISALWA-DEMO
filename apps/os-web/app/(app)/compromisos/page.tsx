import Link from 'next/link';
import { Button, EmptyState, PageContainer, StatGroup, StatusPill } from '@isalwa/ui';
import { CompromisosDeskPanel } from '@/components/commitments/compromisos-desk-panel';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { bucketCompromisosDesk } from '@/lib/commitments/desk-buckets';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  evaluationAllowsDesk,
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';
import { filterCommitmentsForEvaluation } from '@/lib/inicio/filter-for-evaluation';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

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
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'compromisos')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel={COMMITMENT_COPY.title} />;
  }

  try {
    const [openResult, fulfilledResult] = await Promise.all([
      client.listCommitments({ lifecycle: 'open' }),
      client.listCommitments({ lifecycle: 'fulfilled' }),
    ]);
    let allowedPartyIds: Set<string> | null = null;
    if (evaluation.active && evaluation.persona === 'asesor') {
      if (!evaluation.subjectMemberId) {
        allowedPartyIds = new Set();
      } else {
        const parties = await client
          .searchParties({ status: 'active', limit: 100 })
          .catch(() => ({ items: [] as Array<{ partyId: string; commercialOwnerMemberId?: string | null }> }));
        const owned = filterByCommercialOwner(
          evaluation,
          parties.items ?? [],
          (item) => item.commercialOwnerMemberId,
        );
        allowedPartyIds = new Set(owned.map((p) => p.partyId));
      }
    }
    const raw = filterCommitmentsForEvaluation(
      evaluation,
      [...(openResult.items ?? []), ...(fulfilledResult.items ?? [])],
      allowedPartyIds,
    );
    const partyLabels = await resolvePartyLabels(
      client,
      raw.map((item) => item.partyId).filter((id): id is string => Boolean(id)),
    );
    const items = filterByDemoDataMode(raw, dataMode, (item) => {
      if (item.partyId) return isDemoDisplayName(partyLabel(partyLabels, item.partyId));
      return /\bDEMO\b|\[is_demo\]/i.test(item.text ?? '');
    }).filter((item) => !isEngineeringFixtureCopy(item.text));
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
          description="Promesas registradas en la empresa. Un compromiso del cliente no confirma un pago. Para registrar uno nuevo, ábralo desde el cliente."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/clientes">
                <Button type="button" variant="secondary">
                  Ir a clientes
                </Button>
              </Link>
              {buckets.openAll.length > 0 ? (
                <StatusPill tone="warning">
                  {buckets.openAll.length === 1 ? '1 abierto' : `${buckets.openAll.length} abiertos`}
                </StatusPill>
              ) : (
                <StatusPill tone="neutral">Sin abiertos</StatusPill>
              )}
            </div>
          }
        />

        <StatGroup
          className="mb-4"
          items={[
            { label: 'Vence pronto', value: String(buckets.dueSoon.length) },
            { label: 'Equipo', value: String(buckets.team.length) },
            { label: 'Cumplidos', value: String(buckets.completed.length) },
          ]}
        />

        <CompromisosDeskPanel items={items} memberLabels={memberLabels} partyLabels={partyLabels} />
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
