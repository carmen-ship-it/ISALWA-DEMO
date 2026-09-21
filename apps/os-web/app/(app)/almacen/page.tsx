import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, SectionHeader, StatGroup, StatusPill } from '@isalwa/ui';
import '@/components/commercial/commercial-surfaces.css';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { OpsDeskInfoBanner } from '@/components/production/ops-desk-info-banner';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { WarehousePostSaleDesk } from '@/components/warehouse/warehouse-postsale-desk';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { orderHref } from '@/lib/commercial/navigation';
import { actionPrimaryClass } from '@/lib/ui/action-hierarchy';
import { receiveFinishedGoodsAction } from '@/lib/postsale/actions';
import { loadPostSalePedidos } from '@/lib/postsale/load-pedidos';
import type { PostSalePedidoOption } from '@/lib/postsale/pedido-context';
import { loadWarehousePedidosFromOrders } from '@/lib/warehouse/load-pedidos';
import { demoFinishedGoodsOrderIds } from '@/lib/warehouse/demo-fg-citations';
import { WAREHOUSE_TASK_COPY, resolveWarehousePageAccess } from '@/lib/warehouse';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { workItemHref } from '@/lib/work/navigation';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { ListCapNotice } from '@/components/lists/list-cap-notice';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';
import {
  matchesOpsSearch,
  opsBoundedPageHrefs,
  opsListHref,
  parseListQuery,
  windowFilteredOpsCollection,
} from '@/lib/lists/ops-collection';

/** CROSS_LANE: add 'almacenActions' to TOUR_TARGET in lib/walkthrough/targets.ts */
const ALMACEN_ACTIONS_TARGET = 'almacen-actions';

const NO_POSTSALE_PEDIDOS: PostSalePedidoOption[] = [];
const LIST_PATH = '/almacen';

type PedidoWarehouseContext = {
  pedido: PostSalePedidoOption;
  warehouseReviewWorkId: string | null;
  hasFinishedGoodsCitation: boolean;
};

export default async function AlmacenPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const listState = parseListQuery(params);
  const orderIdRaw = params.orderId;
  const selectedOrderId = (Array.isArray(orderIdRaw) ? orderIdRaw[0] : orderIdRaw)?.trim() || null;
  const datosRaw = params.datos;
  const datos = (Array.isArray(datosRaw) ? datosRaw[0] : datosRaw)?.trim() || null;
  const extras = { orderId: selectedOrderId, datos };
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'almacen')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Almacén" />;
  }
  const access = await loadAlmacenAccess();
  const pedidos = access.pedidos;
  const summary = access.summary;
  const contexts = access.contexts;
  const windowed = windowFilteredOpsCollection(contexts, {
    q: listState.q,
    pagina: listState.pagina,
    match: (row, q) =>
      matchesOpsSearch(q, [row.pedido.orderLabel, row.pedido.customerLabel, row.pedido.orderId]),
  });
  const pageLinks = opsBoundedPageHrefs(
    LIST_PATH,
    { ...listState, pagina: undefined },
    windowed.page,
    windowed.pageCount,
    extras,
  );
  const searchAction = opsListHref(
    LIST_PATH,
    { ...listState, q: undefined, pagina: undefined },
    extras,
  );

  return (
    <PageContainer label={WAREHOUSE_TASK_COPY.title} data-tour={ALMACEN_ACTIONS_TARGET}>
      <PageHeader
        kicker={WAREHOUSE_TASK_COPY.kicker}
        title={WAREHOUSE_TASK_COPY.title}
        description={WAREHOUSE_TASK_COPY.intro}
      />
      <StatGroup
        className="mb-4"
        items={[
          { label: 'Revisiones solicitadas', value: String(summary.revisiones) },
          { label: 'Ingresos de producto terminado', value: String(summary.ingresos) },
          { label: 'Pedidos en contexto', value: String(pedidos.length) },
        ]}
      />
      <ListCapNotice caps={access.listCaps ?? []} />
      <OpsDeskInfoBanner
        presentation="compact-chips"
        columns={[
          {
            label: 'Hecho',
            value: 'Registro de ingreso de producto terminado vinculado al pedido.',
          },
          { label: 'No es stock', value: WAREHOUSE_TASK_COPY.notOfficialStock },
          { label: 'No es entrega', value: 'El ingreso no es una entrega ni asigna cumplimiento.' },
        ]}
      />
      <form
        method="get"
        action={LIST_PATH}
        className="mb-4 flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Buscar pedidos de almacén"
      >
        {selectedOrderId ? <input type="hidden" name="orderId" value={selectedOrderId} /> : null}
        {datos ? <input type="hidden" name="datos" value={datos} /> : null}
        <label className="block min-w-[12rem] flex-1 text-sm text-[var(--isalwa-slate)]">
          Buscar Pedido o cliente
          <input
            className="isalwa-field mt-1 w-full"
            type="search"
            name="q"
            defaultValue={listState.q ?? ''}
            placeholder="Pedido o cliente"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-kiln)] px-3 text-sm font-medium text-white"
        >
          Buscar
        </button>
        {listState.q ? (
          <a
            href={searchAction}
            className="inline-flex h-10 items-center px-2 text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
          >
            Limpiar
          </a>
        ) : null}
      </form>
      <PedidoWarehouseContextSection
        rows={windowed.items}
        trueEmpty={windowed.trueEmpty}
        zeroMatch={windowed.zeroMatch}
        searchQuery={listState.q ?? null}
      />
      {windowed.showChrome ? (
        <ListPageNav
          from={windowed.from}
          to={windowed.to}
          total={windowed.matchedTotal}
          page={windowed.page}
          pageCount={windowed.pageCount}
          prevHref={pageLinks.prevHref}
          nextHref={pageLinks.nextHref}
        />
      ) : null}
      <details className="mt-6">
        <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-btn-secondary-border)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)] marker:content-none focus-visible:shadow-[var(--isalwa-shadow-focus)] [&::-webkit-details-marker]:hidden">
          Registrar ingreso
        </summary>
        <div className="mt-4 rounded-[var(--isalwa-radius-card)] border border-[var(--isalwa-mist)] bg-white p-4">
      <WarehousePostSaleDesk
        status={access.status === 'error' ? 'error' : access.status === 'ready' ? 'ready' : 'denied'}
        denial={access.status === 'denied' ? access.reason : null}
        view={access.status === 'ready' ? access.view : null}
        canAllocate={access.status === 'ready' ? access.canAllocate : false}
        canReceive={access.status === 'ready' ? access.canReceive : false}
        pedidos={pedidos}
        initialOrderId={selectedOrderId}
        onReceive={
          access.status === 'ready' && access.canReceive ? receiveFinishedGoodsAction : undefined
        }
      />
        </div>
      </details>
    </PageContainer>
  );
}

function PedidoWarehouseContextSection({
  rows,
  trueEmpty,
  zeroMatch,
  searchQuery,
}: {
  rows: PedidoWarehouseContext[];
  trueEmpty: boolean;
  zeroMatch: boolean;
  searchQuery: string | null;
}) {
  const desktopGrid =
    'md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(9.5rem,auto)_minmax(14rem,max-content)]';
  const headerColumns = [
    { id: 'pedido', label: 'Pedido', className: 'min-w-0' },
    { id: 'client', label: 'Cliente', className: 'min-w-0' },
    { id: 'citation', label: 'Ingreso PT', className: 'min-w-0' },
    { id: 'status', label: 'Estado', className: 'justify-self-end' },
    { id: 'action', label: 'Acciones', className: 'justify-self-end' },
  ];

  return (
    <OpsDeskSurface className="mb-4">
    <PageSection className="p-0 shadow-none" data-section-tone="context" aria-label="Pedidos con contexto de almacén">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos en Almacén
          </h2>
        }
      />
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Cola por pedido: revisión abierta e ingreso PT citado.
      </p>
      {trueEmpty ? (
        <div className="mt-4">
          <EmptyState
            title="Sin pedidos abiertos"
            description="Los pedidos abiertos aparecen aquí. La revisión de almacén se solicita desde el pedido; no se crea sola."
          />
        </div>
      ) : zeroMatch ? (
        <div className="mt-4">
          <EmptyState
            title="Sin coincidencias"
            description={`No hay pedidos que coincidan con “${searchQuery ?? ''}”. Pruebe con otro Pedido o cliente.`}
          />
        </div>
      ) : (
        <div className="commercial-operating-list mt-4 overflow-hidden rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white">
          <OperatingScanListHeader columns={headerColumns} className={desktopGrid} />
          <ul className="m-0 list-none p-0">
            {rows.map((row) => {
              const href = orderHref(row.pedido.partyId, row.pedido.orderId);
              const reviewAction = row.warehouseReviewWorkId ? (
                <Link
                  href={workItemHref(row.warehouseReviewWorkId)}
                  className={`${actionPrimaryClass} h-8 px-3 text-xs`}
                >
                  Ver revisión
                </Link>
              ) : null;
              return (
                <li key={row.pedido.orderId}>
                  <OperatingScanRow
                    href={href}
                    title={row.pedido.orderLabel}
                    desktopGridClassName={desktopGrid}
                    fields={[
                      { id: 'client', label: 'Cliente', value: row.pedido.customerLabel },
                      {
                        id: 'citation',
                        label: 'Ingreso PT',
                        value: row.hasFinishedGoodsCitation ? 'Ingreso PT citado' : 'Sin ingreso citado',
                        hideOnMobile: true,
                      },
                    ]}
                    status={
                      row.warehouseReviewWorkId ? (
                        <StatusPill tone="warning" icon="none">
                          Revisión de almacén
                        </StatusPill>
                      ) : (
                        <StatusPill tone="neutral" icon="none">
                          Sin revisión abierta
                        </StatusPill>
                      )
                    }
                    actionLabel="Ver pedido"
                    primaryAction={reviewAction}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageSection>
    </OpsDeskSurface>
  );
}

async function loadAlmacenAccess() {
  const emptySummary = { revisiones: 0, ingresos: 0 };
  const emptyContexts: PedidoWarehouseContext[] = [];
  try {
    const context = await loadMemberCapabilities();
    if (!context) {
      return {
        ...resolveWarehousePageAccess({ session: null, grantedScopes: null }),
        pedidos: NO_POSTSALE_PEDIDOS,
        summary: emptySummary,
        contexts: emptyContexts,
        listCaps: [] as ListCap[],
      };
    }

    const listCaps: ListCap[] = [];
    let warehousePedidos: Awaited<ReturnType<typeof loadWarehousePedidosFromOrders>> = [];
    let postsalePedidos: PostSalePedidoOption[] = NO_POSTSALE_PEDIDOS;
    let revisiones = 0;
    let contexts: PedidoWarehouseContext[] = [];
    let fgOrderIds: ReadonlySet<string> = new Set();
    const auth = await getServerOsAuthContext();
    if (auth) {
      const client = createOsApiClient(auth);
      const dataMode = await resolveDemoDataMode({});
      fgOrderIds = demoFinishedGoodsOrderIds(dataMode);
      warehousePedidos = await loadWarehousePedidosFromOrders(client, {
        organizationId: context.organizationId,
        listCaps,
      });
      try {
        postsalePedidos = await loadPostSalePedidos(client, {
          organizationId: context.organizationId,
          dataMode,
          listCaps,
        });
      } catch {
        postsalePedidos = NO_POSTSALE_PEDIDOS;
      }
      const allowedOrderIds = new Set(postsalePedidos.map((p) => p.orderId));
      if (postsalePedidos.length > 0 || dataMode === 'demo') {
        warehousePedidos = warehousePedidos.filter((p) => allowedOrderIds.has(p.orderId));
      }
      let workItems: Awaited<ReturnType<typeof client.listWorkItems>>['items'] = [];
      try {
        const workPage = await client.listWorkItems({ status: 'open', limit: 100 });
        workItems = workPage.items ?? [];
        pushListCap(listCaps, workPage, 100);
      } catch {
        workItems = [];
      }
      contexts = postsalePedidos.map((pedido) => {
        const open = findOpenOrderPrepReviews(workItems, pedido.orderId, pedido.partyId);
        if (open.warehouse) revisiones += 1;
        return {
          pedido,
          warehouseReviewWorkId: open.warehouse?.workItemId ?? null,
          hasFinishedGoodsCitation: fgOrderIds.has(pedido.orderId),
        };
      });
    }

    const resolved = resolveWarehousePageAccess({
      session: {
        organizationId: context.organizationId,
        memberId: context.memberId,
        accessStatus: context.accessStatus,
        actorLabel: null,
        grantedScopes: context.grantedScopes,
      },
      grantedScopes: context.grantedScopes,
      facts: { receipts: null, pedidos: warehousePedidos },
    });

    const ingresosFromWaiting =
      resolved.status === 'ready' ? resolved.view?.waiting.length ?? 0 : 0;
    const ingresosFromDemoCitations = contexts.filter((row) => row.hasFinishedGoodsCitation).length;
    const ingresos = Math.max(ingresosFromWaiting, ingresosFromDemoCitations);

    return {
      ...resolved,
      pedidos: postsalePedidos,
      summary: { revisiones, ingresos },
      contexts,
      listCaps,
    };
  } catch {
    return {
      status: 'error' as const,
      pedidos: NO_POSTSALE_PEDIDOS,
      summary: emptySummary,
      contexts: emptyContexts,
      listCaps: [] as ListCap[],
    };
  }
}
