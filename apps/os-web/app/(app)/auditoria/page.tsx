import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { AuditDetailDrawer } from '@/components/audit/audit-detail-drawer';
import { AuditFiltersForm } from '@/components/audit/audit-filters-form';
import { AuditList } from '@/components/audit/audit-list';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
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

  if (!peopleAdmin && !systemAdmin) {
    return (
      <PageContainer label="Auditoría" className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  const result = await client.listAudit(auditListQuery(listState));
  const entryId = listState.entry;
  let detailEntry = entryId ? result.items.find((item) => item.id === entryId) : undefined;
  if (entryId && !detailEntry) {
    try {
      const detailResult = await client.listAudit({ id: entryId, limit: 1 });
      detailEntry = detailResult.items[0];
    } catch {
      detailEntry = undefined;
    }
  }

  const actorIds = [
    ...result.items.map((item) => item.actorMemberId),
    detailEntry?.actorMemberId,
  ].filter((id): id is string => Boolean(id));
  const partyIds = [
    ...result.items.filter((item) => item.resourceType === 'party').map((item) => item.resourceId),
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

      {result.items.length === 0 ? (
        <EmptyState
          title="Sin registros con estos filtros"
          description="Cuando existan cambios auditados en su organización, aparecerán aquí."
        />
      ) : (
        <>
          <PageSection card className="overflow-hidden p-0" aria-label="Registros de auditoría">
            <AuditList
              items={result.items}
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
}

function listStateWithoutEntry(state: AuditQueryState): AuditQueryState {
  const { entry: _entry, ...rest } = state;
  return rest;
}
