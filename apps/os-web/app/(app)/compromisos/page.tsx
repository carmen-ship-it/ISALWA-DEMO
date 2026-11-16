import Link from 'next/link';
import { Button, EmptyState, PageContainer, StatGroup, StatusPill } from '@isalwa/ui';
import { CommitmentCreateDrawer } from '@/components/commitments/commitment-create-drawer';
import { CompromisosDeskPanel } from '@/components/commitments/compromisos-desk-panel';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { ListCapNotice } from '@/components/lists/list-cap-notice';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { cursorPageLinks } from '@/lib/lists/url-state';
import { bucketCompromisosDesk } from '@/lib/commitments/desk-buckets';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
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
  const cursor = typeof params.cursor === 'string' ? params.cursor : undefined;
  const trail = typeof params.trail === 'string' ? params.trail : undefined;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'compromisos')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel={COMMITMENT_COPY.title} />;
  }

  try {
    const PAGE_LIMIT = 25;
    const [openResult, fulfilledResult, queueResult, session, webSession] = await Promise.all([
      client.listCommitments({ lifecycle: 'open', limit: PAGE_LIMIT, ...(cursor ? { cursor } : {}) }),
      client.listCommitments({ lifecycle: 'fulfilled', limit: PAGE_LIMIT }),
      // Only members with handover authority get anything here; for everyone else it is empty.
      client.listCommitments({ view: 'reassignment', limit: PAGE_LIMIT }).catch(() => ({ items: [] })),
      client.getAuthenticatedSession().catch(() => null),
      getServerWebSession().catch(() => null),
    ]);
    const actorMemberId = session?.memberId?.trim() ?? '';
    const organizationId = session?.organizationId?.trim() ?? '';
    const openMeta = (openResult as { meta?: { hasMore?: boolean; nextCursor?: string | null } }).meta;
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
    const queue = filterCommitmentsForEvaluation(evaluation, queueResult.items ?? [], allowedPartyIds).filter(
      (item) => !isEngineeringFixtureCopy(item.text),
    );
    const partyLabels = await resolvePartyLabels(
      client,
      [...raw, ...queue].map((item) => item.partyId).filter((id): id is string => Boolean(id)),
    );
    // A commitment waiting for an owner is shown once, in its own section.
    const queued = new Set(queue.map((item) => item.id));
    const items = raw.filter((item) => !isEngineeringFixtureCopy(item.text) && !queued.has(item.id));
    const buckets = bucketCompromisosDesk(items);
    const memberLabels = await resolveMemberLabels(
      client,
      [...items, ...queue].flatMap((item) =>
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
          description="Promesas registradas en la empresa, con responsable y fecha. Un compromiso del cliente no confirma un pago. También puede registrarlo desde la ficha del cliente."
          action={
            <div className="flex flex-wrap items-center gap-3">
              {actorMemberId && organizationId ? (
                <CommitmentCreateDrawer
                  organizationId={organizationId}
                  actorMemberId={actorMemberId}
                  actorLabel={webSession?.displayLabel?.trim() ?? ''}
                />
              ) : null}
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
            {
              label: 'Vence pronto',
              value: String(buckets.dueSoon.length),
              tone: buckets.dueSoon.length > 0 ? 'var(--isalwa-warning)' : 'var(--isalwa-slate)',
              fill: buckets.dueSoon.length > 0 ? 'attention' : 'neutral',
            },
            { label: 'Equipo', value: String(buckets.team.length), tone: 'var(--isalwa-info)', fill: 'info' },
            {
              label: 'Cumplidos',
              value: String(buckets.completed.length),
              tone: buckets.completed.length > 0 ? 'var(--isalwa-success)' : 'var(--isalwa-slate)',
              fill: buckets.completed.length > 0 ? 'success' : 'neutral',
            },
          ]}
        />

        <CompromisosDeskPanel items={items} reassignmentQueue={queue} memberLabels={memberLabels} partyLabels={partyLabels} />
        {openMeta?.hasMore ? <ListCapNotice caps={[{ hasMore: true, limit: 25 }]} /> : null}
        {(() => {
          const nav = cursorPageLinks(
            '/compromisos',
            { cursor, trail },
            openMeta?.nextCursor ?? null,
            Boolean(openMeta?.hasMore),
          );
          return nav.prevHref || nav.nextHref ? (
            <ListPageNav
              from={items.length > 0 ? 1 : 0}
              to={items.length}
              total={null}
              page={1}
              pageCount={null}
              prevHref={nav.prevHref}
              nextHref={nav.nextHref}
            />
          ) : null;
        })()}
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
