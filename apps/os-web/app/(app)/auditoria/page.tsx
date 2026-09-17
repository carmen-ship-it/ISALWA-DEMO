import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { AuditDetailDrawer } from '@/components/audit/audit-detail-drawer';
import { AuditFiltersForm } from '@/components/audit/audit-filters-form';
import { AuditList } from '@/components/audit/audit-list';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { AUDIT_READ_BOUNDARY } from '@/lib/audit/humanize';
import {
  auditListQuery,
  auditoriaHref,
  parseAuditQuery,
  type AuditQueryState,
} from '@/lib/audit/url-state';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { mayOpenSystemControls } from '@/lib/roles/system-controls';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { viewerHasManagementOrgRead } from '@/lib/management/scope';
import { COMMERCIAL_ORG_READ_SCOPE } from '@isalwa/os-contracts';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';
import {
  evaluationBlocksAuditResource,
  filterAuditItemsForProjection,
} from '@/lib/role-preview/evaluation-history-filter';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

type AuditoriaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const params = await searchParams;
  const listState = parseAuditQuery(params);
  const peopleAdmin = await client.probeAdminAccess();
  const grantedScopes = await loadActorRoleKeys(client);
  const systemAdmin = mayOpenSystemControls(grantedScopes);
  const ownerEvalRead =
    viewerHasManagementOrgRead(grantedScopes) ||
    grantedScopes.includes(COMMERCIAL_ORG_READ_SCOPE);
  const evaluation = await getEvaluationProjection();

  // Owner-eval business audit via management/commercial org read — not people.admin bypass.
  // View As never elevates; filters below narrow the projection.
  if (!peopleAdmin && !systemAdmin && !ownerEvalRead) {
    return (
      <PageContainer label="Auditoría" className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  if (evaluation.active && evaluation.persona === 'asesor' && !evaluation.subjectMemberId) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Auditoría" />;
  }

  let allowedResourceIds: Set<string> | undefined;
  if (evaluation.active && evaluation.persona === 'asesor' && evaluation.subjectMemberId) {
    const parties = await client.searchParties({ status: 'active', limit: 100 }).catch(() => ({ items: [] }));
    const owned = filterByCommercialOwner(
      evaluation,
      parties.items ?? [],
      (p) => p.commercialOwnerMemberId,
    );
    allowedResourceIds = new Set(owned.map((p) => p.partyId));
    // Also allow commercial records owned by subject via list queries
    const [opps, quotes, orders] = await Promise.all([
      client
        .listOpportunities({
          visibility: 'org',
          ownerMemberId: evaluation.subjectMemberId,
          limit: 100,
        })
        .catch(() => ({ items: [] })),
      client
        .listQuotes({
          visibility: 'org',
          ownerMemberId: evaluation.subjectMemberId,
          limit: 100,
        })
        .catch(() => ({ items: [] })),
      client.listOrders({ limit: 100 }).catch(() => ({ items: [] })),
    ]);
    for (const o of opps.items ?? []) allowedResourceIds.add(o.opportunityId);
    for (const q of quotes.items ?? []) {
      allowedResourceIds.add(q.quoteId);
      if (q.partyId) allowedResourceIds.add(q.partyId);
    }
    for (const ord of orders.items ?? []) {
      if (ord.ownerMemberId === evaluation.subjectMemberId) {
        allowedResourceIds.add(ord.orderId);
        if (ord.partyId) allowedResourceIds.add(ord.partyId);
      }
    }
  }

  try {
    const result = await client.listAudit(auditListQuery(listState));
    const filteredItems = filterAuditItemsForProjection(evaluation, result.items, {
      allowedResourceIds,
    });
    const entryId = listState.entry;
    let detailEntry = entryId ? filteredItems.find((item) => item.id === entryId) : undefined;
    if (entryId && !detailEntry) {
      try {
        const detailResult = await client.listAudit({ id: entryId, limit: 1 });
        const candidate = detailResult.items[0];
        if (
          candidate &&
          !evaluationBlocksAuditResource(
            evaluation,
            candidate.resourceType,
            candidate.resourceId,
            allowedResourceIds,
          )
        ) {
          detailEntry = candidate;
        }
      } catch {
        detailEntry = undefined;
      }
    }

    const actorIds = [
      ...filteredItems.map((item) => item.actorMemberId),
      detailEntry?.actorMemberId,
    ].filter((id): id is string => Boolean(id));
    const partyIds = [
      ...filteredItems.filter((item) => item.resourceType === 'party').map((item) => item.resourceId),
      ...(detailEntry?.resourceType === 'party' ? [detailEntry.resourceId] : []),
      ...(listState.resourceId ? [listState.resourceId] : []),
    ];
    const memberLabels = actorIds.length > 0 ? await resolveMemberLabels(client, actorIds) : new Map();
    const partyLabels = partyIds.length > 0 ? await resolvePartyLabels(client, partyIds) : new Map();

    const actorFilterLabel = listState.actorMemberId
      ? memberLabel(memberLabels, listState.actorMemberId)
      : '';
    const partyFilterLabel =
      listState.resourceId && partyLabels.get(listState.resourceId)
        ? partyLabels.get(listState.resourceId)!
        : '';

    const detailActor = detailEntry
      ? detailEntry.actorMemberId
        ? memberLabel(memberLabels, detailEntry.actorMemberId)
        : 'Sistema'
      : '';
    const detailClient =
      detailEntry?.resourceType === 'party'
        ? partyLabels.get(detailEntry.resourceId)
        : undefined;

    return (
      <PageContainer label="Auditoría">
        <PageHeader
          kicker="Administración"
          title="Auditoría"
          description="Quién cambió qué y cuándo, sin exportar ni editar desde aquí."
          action={<StatusPill tone="neutral">Solo lectura</StatusPill>}
        />

        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {AUDIT_READ_BOUNDARY}
          {!peopleAdmin && systemAdmin ? (
            <>
              {' '}
              Acceso vía{' '}
              <Link href="/sistema" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
                Controles del sistema
              </Link>
              .
            </>
          ) : null}
        </p>

        <PageSection card className="mb-6">
          <AuditFiltersForm
            initial={listState}
            actorLabel={actorFilterLabel}
            partyLabel={partyFilterLabel}
          />
        </PageSection>

        {filteredItems.length === 0 ? (
          <EmptyState
            title="Sin registros con estos filtros"
            description="Cuando existan cambios auditados en su organización, aparecerán aquí."
          />
        ) : (
          <>
            <PageSection card className="overflow-hidden p-0" aria-label="Registros de auditoría">
              <AuditList
                items={filteredItems}
                listState={listStateWithoutEntry(listState)}
                memberLabels={memberLabels}
                partyLabels={partyLabels}
                selectedEntryId={entryId}
              />
            </PageSection>
            {result.meta?.hasMore && result.meta.nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={auditoriaHref('/auditoria', {
                    ...listStateWithoutEntry(listState),
                    cursor: result.meta.nextCursor,
                  })}
                  className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                >
                  Cargar más
                </Link>
              </div>
            ) : null}
          </>
        )}

        <AuditDetailDrawer
          open={Boolean(entryId && detailEntry)}
          entry={detailEntry ?? null}
          listState={listStateWithoutEntry(listState)}
          actorLabel={detailActor}
          clientLabel={detailClient}
        />
      </PageContainer>
    );
  } catch (err) {
    // Product-safe denial/error — never raw Next application error. Root auth remains API scopes.
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return (
        <PageContainer label="Auditoría" className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Auditoría">
        <PageHeader
          kicker="Administración"
          title="Auditoría"
          description="Quién cambió qué y cuándo, sin exportar ni editar desde aquí."
        />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}

function listStateWithoutEntry(state: AuditQueryState): AuditQueryState {
  const { entry: _entry, ...rest } = state;
  return rest;
}
