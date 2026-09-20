import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection, StatGroup, cx } from '@isalwa/ui';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { TrabajoListToolbar } from '@/components/work/trabajo-list-toolbar';
import { WorkList } from '@/components/work/work-list';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { cursorPageLinks, listHref, parseListQuery, type ListQueryState } from '@/lib/lists/url-state';
import { partyHref } from '@/lib/party/navigation';
import {
  presentWorkPage,
  readListControls,
} from '@/lib/productivity/list-controls';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { probeWorkOrgLens, probeWorkTeamLens } from '@/lib/work/trabajo-lens';
import { trabajoLensClarity } from '@/lib/work/trabajo-lens-clarity';
import { summarizeTrabajoOpen } from '@/lib/work/trabajo-summary';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';

const PAGE_LIMIT = 25;

type TrabajoView = 'mine' | 'overdue' | 'team' | 'org';

type TrabajoPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const tabClass =
  'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border px-4 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export default async function TrabajoPage({ searchParams }: TrabajoPageProps) {
  const params = await searchParams;
  const query = parseListQuery(params);
  const requestedView = parseTrabajoView(query.view);
  const controls = readListControls(query);
  const dataMode = await resolveDemoDataMode(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();

  const client = createOsApiClient(auth);
  const [probedTeamLens, probedOrgLens] = await Promise.all([
    probeWorkTeamLens(client),
    probeWorkOrgLens(client),
  ]);
  const canTeamLens = evaluation.active
    ? evaluation.persona === 'jefe-comercial' || evaluation.persona === 'gerencia'
      ? true
      : false
    : probedTeamLens;
  const canOrgLens = evaluation.active
    ? evaluation.persona === 'gerencia'
    : probedOrgLens;
  const view =
    requestedView === 'org' && !canOrgLens
      ? 'mine'
      : requestedView === 'team' && !canTeamLens
        ? 'mine'
        : requestedView;
  const subjectType = query.subjectType;
  const subjectId = query.subjectId;
  const filteredByParty = subjectType === 'party' && Boolean(subjectId);
  const listState: ListQueryState = {
    view: view === 'mine' ? undefined : view,
    subjectType: filteredByParty ? subjectType : undefined,
    subjectId: filteredByParty ? subjectId : undefined,
    q: controls.q,
    sort: controls.sort === 'due' ? undefined : controls.sort,
    density: controls.density === 'compact' ? undefined : controls.density,
    focus: controls.focus,
  };
  const visibility = (() => {
    if (!evaluation.active) {
      return view === 'team' || view === 'org' ? view : undefined;
    }
    // Carmen stays authenticated. Org read she already has is narrowed to the
    // projected person. Do not pass a foreign owner on the default own scope —
    // that is a permission dead end, not a missing grant.
    if (evaluation.persona === 'asesor') return evaluation.subjectMemberId ? 'org' : undefined;
    if (evaluation.persona === 'jefe-comercial') {
      return view === 'team' || view === 'org' ? 'team' : undefined;
    }
    if (evaluation.persona === 'gerencia') {
      return view === 'team' || view === 'org' ? view : undefined;
    }
    return view === 'team' || view === 'org' ? view : undefined;
  })();

  try {
    const result = await client.listWorkItems({
      status: 'open',
      limit: PAGE_LIMIT,
      ...(view === 'overdue' ? { overdue: true } : {}),
      ...(visibility ? { visibility } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(filteredByParty ? { subjectType, subjectId } : {}),
      ...(controls.q ? { q: controls.q } : {}),
      ...(evaluation.active &&
      evaluation.persona === 'asesor' &&
      evaluation.subjectMemberId
        ? { ownerMemberId: evaluation.subjectMemberId }
        : {}),
    });
    const titled = result.items.filter((item) => {
      if (isEngineeringFixtureCopy(item.title) || isEngineeringFixtureCopy(item.description)) return false;
      if (
        evaluation.active &&
        evaluation.persona === 'asesor' &&
        evaluation.subjectMemberId
      ) {
        return item.ownerMemberId === evaluation.subjectMemberId;
      }
      return true;
    });
    const partyLabels = await resolvePartyLabels(
      client,
      titled.flatMap((item) => (item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [])),
    );
    const modeFiltered = filterByDemoDataMode(titled, dataMode, (item) => {
      if (item.subjectType === 'party' && item.subjectId) {
        return isDemoDisplayName(partyLabels.get(item.subjectId) ?? null);
      }
      // Team/org work without party: include in demo when title/notes carry DEMO marker.
      return /\bDEMO\b|\[is_demo\]/i.test(`${item.title} ${item.description ?? ''}`);
    });
    const items = presentWorkPage(modeFiltered, controls);
    const summary = summarizeTrabajoOpen(items);
    const memberLabels = await resolveMemberLabels(
      client,
      items.flatMap((item) => [item.ownerMemberId, item.createdByMemberId]),
    );

    return (
      <PageContainer label="Mi trabajo">
        <PageHeader
          kicker={t('pages.trabajo.kicker')}
          title="Mi trabajo"
          description={t('pages.trabajo.description')}
          action={
            filteredByParty && subjectId ? (
              <Link href={partyHref(subjectId)} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
                Ver cliente
              </Link>
            ) : undefined
          }
        />

        <StatGroup
          className="mb-4"
          items={[
            { label: 'Para hoy', value: String(summary.paraHoy) },
            { label: 'Vencido', value: String(summary.vencido) },
            { label: 'Próximo', value: String(summary.proximo) },
            { label: 'Sin fecha', value: String(summary.sinFecha) },
          ]}
        />

        <TrabajoViewTabs
          active={view}
          state={listState}
          canTeamLens={canTeamLens}
          canOrgLens={canOrgLens}
        />
        <p className="mb-4 text-sm text-[var(--isalwa-slate)]">{trabajoLensClarity(view)}</p>

        <TrabajoListToolbar state={listState} controls={controls} />

        <StaleProjectionBanner freshness={result.freshness} />

        {items.length === 0 ? (
          <EmptyState
            title={emptyTitle(view, filteredByParty, controls)}
            description={emptyDescription(view, filteredByParty, controls)}
            action={
              controls.q || controls.focus ? (
                <Link
                  href={listHref('/trabajo', { ...listState, q: undefined, focus: undefined }, [
                    'q',
                    'focus',
                    'cursor',
                  ])}
                  className="inline-flex"
                >
                  <Button type="button" variant="secondary">
                    Limpiar búsqueda y filtros
                  </Button>
                </Link>
              ) : view === 'mine' && !filteredByParty ? (
                <Link href="/clientes" className="inline-flex">
                  <Button type="button" variant="primary">
                    {t('states.goToClientes')}
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <PageSection card className="overflow-hidden p-0">
              <WorkList
                items={items}
                memberLabels={memberLabels}
                partyLabels={partyLabels}
                density={controls.density}
                showHeader
              />
            </PageSection>
            {(() => {
              const nav = cursorPageLinks(
                '/trabajo',
                listState,
                result.meta.nextCursor,
                result.meta.hasMore,
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
          </>
        )}
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label="Mi trabajo">
        <PageHeader
          kicker={t('pages.trabajo.kicker')}
          title="Mi trabajo"
          description={t('pages.trabajo.description')}
        />
        <TrabajoViewTabs active={view} state={listState} canTeamLens={false} canOrgLens={false} />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}

function TrabajoViewTabs({
  active,
  state,
  canTeamLens,
  canOrgLens,
}: {
  active: TrabajoView;
  state: ListQueryState;
  canTeamLens: boolean;
  canOrgLens: boolean;
}) {
  const tabs: Array<{ id: TrabajoView; label: string }> = [
    { id: 'mine', label: 'Mío' },
    { id: 'overdue', label: 'Vencidos' },
  ];
  if (canTeamLens || active === 'team') tabs.splice(1, 0, { id: 'team', label: 'Equipo' });
  if (canOrgLens) tabs.splice(tabs.length - 1, 0, { id: 'org', label: 'Empresa' });

  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Vista de trabajo">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={listHref(
              '/trabajo',
              { ...state, view: tab.id === 'mine' ? undefined : tab.id },
              ['cursor'],
            )}
            role="tab"
            aria-selected={selected}
            className={cx(
              tabClass,
              selected
                ? 'border-[var(--isalwa-kiln)] bg-white text-[var(--isalwa-kiln)]'
                : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function parseTrabajoView(raw: string | undefined): TrabajoView {
  if (raw === 'overdue' || raw === 'team' || raw === 'org') return raw;
  return 'mine';
}

function emptyTitle(
  view: TrabajoView,
  filteredByParty: boolean,
  controls: ReturnType<typeof readListControls>,
): string {
  if (controls.q || controls.focus) return 'Ningún trabajo coincide con estos filtros.';
  if (view === 'overdue') return 'Todo al día.';
  if (view === 'team' || view === 'org') return 'No hay trabajo abierto en esta vista.';
  if (filteredByParty) return 'Todo al día.';
  return 'Todo al día.';
}

function emptyDescription(
  view: TrabajoView,
  filteredByParty: boolean,
  controls: ReturnType<typeof readListControls>,
): string {
  if (controls.q || controls.focus) {
    return 'Pruebe limpiar la búsqueda o el enfoque. La vista y el cliente filtrado se mantienen.';
  }
  if (view === 'overdue') {
    return filteredByParty
      ? 'Este cliente no tiene trabajo abierto vencido.'
      : 'Sin fechas vencidas en esta vista.';
  }
  if (view === 'team') return 'Sin trabajo abierto del equipo en esta lectura.';
  if (view === 'org') return 'Sin trabajo abierto de la empresa en esta lectura.';
  if (filteredByParty) return 'Sin trabajo abierto para este cliente.';
  return 'Sin trabajo pendiente a su nombre.';
}
