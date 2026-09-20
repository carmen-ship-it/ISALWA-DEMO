import Link from 'next/link';
import { Button, EmptyState, PageSection, StatusPill, cx } from '@isalwa/ui';
import { CommercialListToolbar } from '@/components/commercial/commercial-list-toolbar';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import { OrderOrgList } from '@/components/commercial/order-org-list';
import {
  commercialToolbarClass,
  commercialWorkSurfaceClass,
} from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { formatOrderStatus } from '@/lib/commercial/labels';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { cursorPageLinks, listHref, parseListQuery, type ListQueryState } from '@/lib/lists/url-state';
import { boundedPageHrefs, parsePageNumber, sliceListPage } from '@/lib/lists/page-window';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { readListControls } from '@/lib/productivity/list-controls';

type PedidosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ORDER_LIST_STATUSES = ['open', 'cancelled'] as const;
type OrderListStatus = (typeof ORDER_LIST_STATUSES)[number];

const LIST_LIMIT = 25;
const LIST_PATH = '/pedidos';

function parseOrderListStatus(raw: string | undefined): OrderListStatus {
  if (raw === 'open' || raw === 'cancelled') return raw;
  return 'open';
}

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

function emptyDescription(status: OrderListStatus, hasQuery: boolean): string {
  if (hasQuery) {
    return 'Ningún pedido de este estado coincide con el número buscado.';
  }
  if (status === 'cancelled') {
    return 'No hay pedidos cancelados en esta vista.';
  }
  return 'Los pedidos se crean al convertir una cotización elegible. Esta lista no crea pedidos.';
}

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const params = await searchParams;
  const parsed = parseListQuery(params);
  const status = parseOrderListStatus(parsed.status);
  const listState: ListQueryState = { ...parsed, status };
  const dataMode = await resolveDemoDataMode(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'commercial')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Pedidos" />;
  }

  const client = createOsApiClient(auth);

  try {
    const result = await client.listOrders({
      status,
      limit: dataMode === 'demo' ? 100 : LIST_LIMIT,
      ...(listState.q ? { q: listState.q } : {}),
      ...(dataMode === 'demo' ? {} : listState.cursor ? { cursor: listState.cursor } : {}),
      // Owner-eval needs org visibility so peer-owned SYNTH pedidos (e.g. Maderas) appear.
      ...(evaluation.active ? commercialListQueryFromProjection(evaluation) : { visibility: 'org' }),
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
          !isEngineeringFixtureCopy(item.orderNumber) &&
          !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
      ),
      dataMode,
      (item) => isDemoDisplayName(partyLabel(partyLabels, item.partyId)),
    );
    const windowed = dataMode === 'demo' ? sliceListPage(loaded, parsePageNumber(listState.pagina)) : null;
    const visible = windowed?.items ?? loaded;
    const hasQuery = Boolean(listState.q);
    const controls = readListControls(listState);
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
      <CommercialPageFrame label="Pedidos">
        <PageHeader
          kicker="Comercial"
          title="Pedidos"
          description="Un pedido nace al convertir una cotización elegible. No se crea desde esta lista."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/cotizaciones">
                <Button type="button" variant="secondary">
                  Ver cotizaciones
                </Button>
              </Link>
              <StatusPill tone="neutral">{formatOrderStatus(status)}</StatusPill>
            </div>
          }
        />

        <div className={`commercial-toolbar ${commercialToolbarClass}`}>
          <CommercialListToolbar
            path={LIST_PATH}
            state={listState}
            searchLabel="Buscar"
            searchPlaceholder="Número de pedido"
            hiddenFields={{
              status,
              density: controls.density === 'compact' ? undefined : controls.density,
            }}
            clearSearchHref={workingHref(
              { ...listState, status, density: listState.density },
              ['q', 'cursor', 'panel'],
            )}
          />

          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Filtro de pedidos">
            {ORDER_LIST_STATUSES.map((tabStatus) => {
              const active = tabStatus === status;
              return (
                <Link
                  key={tabStatus}
                  href={workingHref({ ...listState, status: tabStatus }, ['cursor', 'panel'])}
                  role="tab"
                  aria-selected={active}
                  className={tabClass(active)}
                >
                  {formatOrderStatus(tabStatus)}
                </Link>
              );
            })}
          </div>
        </div>

        <StaleProjectionBanner freshness={result.freshness} />

        {visible.length === 0 ? (
          <EmptyState
            className="commercial-empty-nest"
            title={hasQuery ? 'Sin resultados' : 'Sin pedidos en esta vista'}
            description={emptyDescription(status, hasQuery)}
            action={
              <div className="flex flex-wrap gap-3">
                {hasQuery ? (
                  <Link href={workingHref({ ...listState, status, density: listState.density }, ['q', 'cursor', 'panel'])}>
                    <Button type="button">Limpiar búsqueda</Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/cotizaciones">
                      <Button type="button">Ver cotizaciones</Button>
                    </Link>
                    <Link href="/clientes">
                      <Button type="button" variant="secondary">
                        Ir a clientes
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            }
          />
        ) : (
          <PageSection card className={`p-0 ${commercialWorkSurfaceClass}`}>
            <OrderOrgList
              items={visible}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
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
      </CommercialPageFrame>
    );
  } catch (err) {
    return (
      <CommercialPageFrame label="Pedidos">
        <PageHeader kicker="Comercial" title="Pedidos" />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </CommercialPageFrame>
    );
  }
}
