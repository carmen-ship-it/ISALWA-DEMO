import Link from 'next/link';
import { Button, EmptyState, PageSection, StatusPill, cx } from '@isalwa/ui';
import { CommercialListToolbar } from '@/components/commercial/commercial-list-toolbar';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import {
  commercialPrimaryLinkClass,
  commercialToolbarClass,
  commercialWorkSurfaceClass,
} from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { QuoteQuickView } from '@/components/operating/quote-quick-view';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  cotizacionesHref,
  parseQuoteListStatus,
  quoteStatusFilterOptions,
  type QuoteListStatus,
} from '@/lib/commercial/list-filters';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import {
  hrefWithoutPanel,
  listHref,
  panelHref,
  parseListQuery,
  parsePanel,
  cursorPageLinks,
  type ListQueryState,
} from '@/lib/lists/url-state';
import { boundedPageHrefs, parsePageNumber, sliceListPage } from '@/lib/lists/page-window';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { readListControls } from '@/lib/productivity/list-controls';

type CotizacionesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LIST_LIMIT = 25;
const LIST_PATH = '/cotizaciones';

const tabClass = (active: boolean) =>
  cx(
    'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border px-4 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
    active
      ? 'border-[var(--isalwa-kiln)] bg-white text-[var(--isalwa-kiln)]'
      : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]',
  );

function workingHref(state: ListQueryState, omit: Array<keyof ListQueryState> = []): string {
  return listHref(LIST_PATH, state, omit);
}

function clearSearchHref(status: QuoteListStatus, view?: string): string {
  if (!view) return cotizacionesHref(status);
  return listHref(LIST_PATH, { status, view }, ['q', 'cursor', 'panel']);
}

function emptyDescription(status: QuoteListStatus, hasQuery: boolean): string {
  if (hasQuery) {
    return 'Ninguna cotización de este estado coincide con el número buscado.';
  }
  if (status === 'draft') {
    return 'Un borrador se prepara desde una oportunidad del cliente. Ábralo allí para crear la cotización.';
  }
  if (status === 'submitted') {
    return 'Las cotizaciones enviadas al cliente aparecen aquí. Si aún está en preparación, revísela en borrador o en la oportunidad.';
  }
  if (status === 'accepted') {
    return 'Las cotizaciones aceptadas aparecen aquí. La conversión se registra en la cotización.';
  }
  return 'Las cotizaciones canceladas aparecen aquí.';
}

export default async function CotizacionesPage({ searchParams }: CotizacionesPageProps) {
  const params = await searchParams;
  const parsed = parseListQuery(params);
  const status = parseQuoteListStatus(parsed.status);
  const listState: ListQueryState = { ...parsed, status };
  const panel = parsePanel(listState.panel);
  const dataMode = await resolveDemoDataMode(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'commercial')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Cotizaciones" />;
  }

  const client = createOsApiClient(auth);
  const filters = quoteStatusFilterOptions(status);

  try {
    // Demo densify: wider page so party-name filter can see SYNTH quotes (q is quoteNumber-only).
    const result = await client.listQuotes({
      status,
      limit: dataMode === 'demo' ? 100 : LIST_LIMIT,
      ...(listState.q ? { q: listState.q } : {}),
      ...(dataMode === 'demo' ? {} : listState.cursor ? { cursor: listState.cursor } : {}),
      ...commercialListQueryFromProjection(evaluation),
    });
    const memberLabels = await resolveMemberLabels(
      client,
      result.items.map((item) => item.ownerMemberId),
    );
    const partyLabels = await resolvePartyLabels(
      client,
      result.items.map((item) => item.partyId),
    );
    const loaded = filterByDemoDataMode(
      result.items.filter(
        (item) =>
          !isEngineeringFixtureCopy(item.quoteNumber) &&
          !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
      ),
      dataMode,
      (item) => isDemoDisplayName(partyLabel(partyLabels, item.partyId)),
    );
    const windowed = dataMode === 'demo' ? sliceListPage(loaded, parsePageNumber(listState.pagina)) : null;
    const visible = windowed?.items ?? loaded;
    const preview =
      panel?.kind === 'quote' ? loaded.find((item) => item.quoteId === panel.id) : undefined;
    const previewPanel = preview
      ? listState.cursor
        ? listHref(LIST_PATH, { ...listState, panel: `quote:${preview.quoteId}` })
        : panelHref(LIST_PATH, listState, `quote:${preview.quoteId}`)
      : null;
    const hasQuery = Boolean(listState.q);
    const controls = readListControls(listState);
    const statusLabel =
      filters.find((filter) => filter.status === status)?.label ?? status;
    const demoNav = windowed?.showChrome
      ? boundedPageHrefs(LIST_PATH, listState, windowed.page, windowed.pageCount)
      : null;
    const cursorNav =
      dataMode !== 'demo'
        ? cursorPageLinks(LIST_PATH, listState, result.meta.nextCursor, result.meta.hasMore)
        : null;
    const prevHref = demoNav?.prevHref ?? cursorNav?.prevHref ?? null;
    const nextHref = demoNav?.nextHref ?? cursorNav?.nextHref ?? null;

    return (
      <CommercialPageFrame label={t('pages.cotizaciones.title')}>
        <PageHeader
          kicker={t('pages.cotizaciones.kicker')}
          title={t('pages.cotizaciones.title')}
          description="Para crear una cotización, primero registre la oportunidad comercial. Elija el cliente y, si ya tiene una oportunidad, ábrala para crear la cotización."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/clientes">
                <Button type="button">Elegir cliente</Button>
              </Link>
              <Link href="/oportunidades">
                <Button type="button" variant="secondary">
                  Ver oportunidades
                </Button>
              </Link>
              <StatusPill tone="neutral">{statusLabel}</StatusPill>
            </div>
          }
        />

        <div className={`commercial-toolbar ${commercialToolbarClass}`}>
          <CommercialListToolbar
            path={LIST_PATH}
            state={listState}
            searchLabel="Buscar"
            searchPlaceholder="Número de cotización"
            hiddenFields={{
              status,
              view: listState.view,
              density: controls.density === 'compact' ? undefined : controls.density,
            }}
            clearSearchHref={listHref(
              LIST_PATH,
              { status, view: listState.view, density: listState.density },
              ['q', 'cursor', 'panel'],
            )}
          />

          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Filtro de cotizaciones">
            {filters.map((filter) => {
              const active = filter.status === status;
              return (
                <Link
                  key={filter.status}
                  href={workingHref({ ...listState, status: filter.status }, ['cursor', 'panel'])}
                  role="tab"
                  aria-selected={active}
                  className={tabClass(active)}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
        </div>

        <StaleProjectionBanner freshness={result.freshness} />

        {visible.length === 0 ? (
          <EmptyState
            className="commercial-empty-nest"
            title={hasQuery ? 'Sin resultados' : t('states.emptyCotizaciones')}
            description={emptyDescription(status, hasQuery)}
            example={
              status === 'draft' && !hasQuery
                ? 'Un cliente activo puede no tener cotizaciones todavía. La primera nace desde una oportunidad.'
                : undefined
            }
            action={
              <div className="flex flex-wrap gap-3">
                {hasQuery ? (
                  <Link href={clearSearchHref(status, listState.view)} className={commercialPrimaryLinkClass}>
                    Limpiar búsqueda
                  </Link>
                ) : (
                  <>
                    <Link href="/clientes" className={commercialPrimaryLinkClass}>
                      {t('states.goToClientes')}
                    </Link>
                    <Link href="/oportunidades" className="inline-flex">
                      <Button type="button" variant="secondary">
                        {t('states.viewOpportunities')}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            }
          />
        ) : (
          <PageSection card className={`p-0 ${commercialWorkSurfaceClass}`}>
            <QuoteOrgList
              items={visible}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
              showAmount
              listState={listState}
              selectedQuoteId={preview?.quoteId}
              density={controls.density}
            />
          </PageSection>
        )}

        {prevHref || nextHref ? (
          <ListPageNav
            from={windowed?.from ?? 1}
            to={windowed?.to ?? visible.length}
            total={windowed ? windowed.total : null}
            page={windowed?.page ?? 1}
            pageCount={windowed ? windowed.pageCount : null}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        ) : null}

        {preview ? (
          <QuoteQuickView
            key={previewPanel ?? preview.quoteId}
            quote={preview}
            customer={partyLabel(partyLabels, preview.partyId)}
            owner={memberLabel(memberLabels, preview.ownerMemberId)}
            closeHref={hrefWithoutPanel(LIST_PATH, listState)}
          />
        ) : null}
      </CommercialPageFrame>
    );
  } catch (err) {
    return (
      <CommercialPageFrame label={t('pages.cotizaciones.title')}>
        <PageHeader kicker={t('pages.cotizaciones.kicker')} title={t('pages.cotizaciones.title')} />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </CommercialPageFrame>
    );
  }
}
