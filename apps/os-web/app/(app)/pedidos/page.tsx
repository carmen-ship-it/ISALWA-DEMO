import Link from 'next/link';
import { EmptyState, PageSection, SearchField, StatusPill, cx } from '@isalwa/ui';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import { OrderOrgList } from '@/components/commercial/order-org-list';
import {
  commercialPrimaryButtonClass,
  commercialPrimaryLinkClass,
  commercialToolbarClass,
  commercialWorkSurfaceClass,
} from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { formatOrderStatus } from '@/lib/commercial/labels';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { listHref, parseListQuery, type ListQueryState } from '@/lib/lists/url-state';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

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
  return 'Aquí aparecen los pedidos abiertos, con cliente y responsable. Ábralos desde el cliente o la cotización convertida.';
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
    const visible = filterByDemoDataMode(
      result.items.filter(
        (item) =>
          !isEngineeringFixtureCopy(item.orderNumber) &&
          !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
      ),
      dataMode,
      (item) => isDemoDisplayName(partyLabel(partyLabels, item.partyId)),
    );
    const hasQuery = Boolean(listState.q);
    const nextHref =
      dataMode !== 'demo' && result.meta.hasMore && result.meta.nextCursor
        ? workingHref({ ...listState, cursor: result.meta.nextCursor }, ['panel'])
        : null;

    return (
      <CommercialPageFrame label="Pedidos">
        <PageHeader
          kicker="Comercial"
          title="Pedidos"
          description={
            visible.length === 0
              ? undefined
              : 'Pedidos de la empresa en el modo de datos activo. El detalle conserva el mismo registro canónico.'
          }
          action={<StatusPill tone="neutral">{formatOrderStatus(status)}</StatusPill>}
        />

        <div className={`commercial-toolbar ${commercialToolbarClass}`}>
          <form
            key={`${status}:${listState.q ?? ''}`}
            method="get"
            action={LIST_PATH}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="status" value={status} />
            <div className="min-w-0 flex-1">
              <label
                htmlFor="pedidos-q"
                className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]"
              >
                Buscar
              </label>
              <SearchField
                id="pedidos-q"
                name="q"
                defaultValue={listState.q ?? ''}
                placeholder="Número de pedido"
                autoComplete="off"
              />
            </div>
            <button type="submit" className={commercialPrimaryButtonClass}>
              Buscar
            </button>
            {hasQuery ? (
              <Link
                href={workingHref({ ...listState, status }, ['q', 'cursor', 'panel'])}
                className="inline-flex h-10 shrink-0 items-center text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
              >
                Limpiar
              </Link>
            ) : null}
          </form>

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
                <Link href="/clientes" className={commercialPrimaryLinkClass}>
                  Ir a clientes
                </Link>
                <Link href="/cotizaciones" className="inline-flex">
                  <span className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
                    Ver cotizaciones
                  </span>
                </Link>
              </div>
            }
          />
        ) : (
          <PageSection card className={`p-0 ${commercialWorkSurfaceClass}`}>
            <OrderOrgList items={visible} memberLabels={memberLabels} partyLabels={partyLabels} />
          </PageSection>
        )}

        {nextHref ? (
          <div className="mt-6 flex justify-center">
            <Link
              href={nextHref}
              className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-5 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              Cargar más
            </Link>
          </div>
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
