import Link from 'next/link';
import { Button, EmptyState, PageContainer, PageSection, cx } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { TrabajoListToolbar } from '@/components/work/trabajo-list-toolbar';
import { WorkList } from '@/components/work/work-list';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { listHref, parseListQuery, type ListQueryState } from '@/lib/lists/url-state';
import { partyHref } from '@/lib/party/navigation';
import {
  presentWorkPage,
  readListControls,
} from '@/lib/productivity/list-controls';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

const PAGE_LIMIT = 25;

type TrabajoView = 'mine' | 'overdue' | 'team' | 'org';

type TrabajoPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const tabClass =
  'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border px-4 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export default async function TrabajoPage({ searchParams }: TrabajoPageProps) {
  const query = parseListQuery(await searchParams);
  const view = parseTrabajoView(query.view);
  const controls = readListControls(query);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
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
  const visibility = view === 'team' || view === 'org' ? view : undefined;

  try {
    const result = await client.listWorkItems({
      status: 'open',
      limit: PAGE_LIMIT,
      ...(view === 'overdue' ? { overdue: true } : {}),
      ...(visibility ? { visibility } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(filteredByParty ? { subjectType, subjectId } : {}),
      ...(controls.q ? { q: controls.q } : {}),
    });
    const items = presentWorkPage(
      result.items.filter((item) => !isEngineeringFixtureCopy(item.title)),
      controls,
    );
    const memberLabels = await resolveMemberLabels(
      client,
      items.flatMap((item) => [item.ownerMemberId, item.createdByMemberId]),
    );
    const partyLabels = await resolvePartyLabels(
      client,
      items.flatMap((item) => (item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [])),
    );

    return (
      <PageContainer label={t('pages.trabajo.title')}>
        <PageHeader
          kicker={t('pages.trabajo.kicker')}
          title={t('pages.trabajo.title')}
          description={pageDescription(view, filteredByParty)}
          action={
            filteredByParty && subjectId ? (
              <Link href={partyHref(subjectId)} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
                Ver cliente
              </Link>
            ) : undefined
          }
        />

        <TrabajoViewTabs active={view} state={listState} showRequestedLens />

        <TrabajoListToolbar state={listState} controls={controls} />

        <StaleProjectionBanner freshness={result.freshness} />

        {items.length === 0 ? (
          <EmptyState
            title={emptyTitle(view, filteredByParty, controls)}
            description={emptyDescription(view, filteredByParty, controls)}
            example={
              view === 'mine' && !filteredByParty && !controls.q && !controls.focus
                ? 'Un seguimiento con responsable y fecha permanece aquí hasta que lo complete.'
                : undefined
            }
            action={
              view === 'mine' && !filteredByParty && !controls.q && !controls.focus ? (
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
            {result.meta.hasMore && result.meta.nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={listHref('/trabajo', { ...listState, cursor: result.meta.nextCursor })}
                  className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                >
                  Cargar más
                </Link>
              </div>
            ) : null}
          </>
        )}
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label={t('pages.trabajo.title')}>
        <PageHeader
          kicker={t('pages.trabajo.kicker')}
          title={t('pages.trabajo.title')}
          description={pageDescription(view, filteredByParty)}
        />
        <TrabajoViewTabs active={view} state={listState} />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}

function TrabajoViewTabs({
  active,
  state,
  showRequestedLens = false,
}: {
  active: TrabajoView;
  state: ListQueryState;
  /** Only after this request succeeded. A denial must not look like an offered lens. */
  showRequestedLens?: boolean;
}) {
  const tabs: Array<{ id: TrabajoView; label: string }> = [
    { id: 'mine', label: 'Míos' },
    { id: 'overdue', label: 'Vencidos' },
  ];
  if (showRequestedLens && active === 'team') tabs.push({ id: 'team', label: 'Equipo' });
  if (showRequestedLens && active === 'org') tabs.push({ id: 'org', label: 'Empresa' });

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

function pageDescription(view: TrabajoView, filteredByParty: boolean): string {
  if (filteredByParty && view === 'overdue') {
    return 'Trabajo abierto de este cliente cuya fecha ya pasó.';
  }
  if (filteredByParty) return 'Trabajo abierto vinculado a este cliente, en la misma cola.';
  if (view === 'overdue') return 'Trabajo abierto cuya fecha ya pasó.';
  if (view === 'team') return 'Trabajo abierto de las personas a su cargo. Solo lectura.';
  if (view === 'org') return 'Trabajo abierto de la empresa. Solo lectura.';
  return 'Cola de trabajo abierto, con responsable, cliente y fecha.';
}

function emptyTitle(
  view: TrabajoView,
  filteredByParty: boolean,
  controls: ReturnType<typeof readListControls>,
): string {
  if (controls.q || controls.focus) return 'Ningún trabajo coincide con estos filtros.';
  if (view === 'overdue') return 'No tiene trabajo vencido en este momento.';
  if (view === 'team' || view === 'org') return 'No hay trabajo abierto en esta vista.';
  if (filteredByParty) return 'No tiene trabajo pendiente en este momento.';
  return 'No tiene trabajo pendiente en este momento.';
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
      : 'Cuando una fecha de trabajo abierto ya pasó, lo verá aquí. Completarlo sigue en el detalle.';
  }
  if (view === 'team') return 'No hay trabajo abierto de las personas a su cargo.';
  if (view === 'org') return 'No hay trabajo abierto de la empresa en esta página.';
  if (filteredByParty) {
    return 'Este cliente no tiene trabajo abierto en la cola. Un seguimiento registrado en su ficha aparecerá aquí.';
  }
  return 'Esta es su cola de trabajo. Cuando registre un seguimiento en la ficha de un cliente, o se le asigne una tarea, lo verá aquí.';
}
