import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, SectionHeader, StatGroup, StatusPill } from '@isalwa/ui';
import '@/components/commercial/commercial-surfaces.css';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { WarehousePostSaleDesk } from '@/components/warehouse/warehouse-postsale-desk';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { orderHref } from '@/lib/commercial/navigation';
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
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';

/** CROSS_LANE: add 'almacenActions' to TOUR_TARGET in lib/walkthrough/targets.ts */
const ALMACEN_ACTIONS_TARGET = 'almacen-actions';

const NO_POSTSALE_PEDIDOS: PostSalePedidoOption[] = [];

type PedidoWarehouseContext = {
  pedido: PostSalePedidoOption;
  warehouseReviewWorkId: string | null;
  hasFinishedGoodsCitation: boolean;
};

export default async function AlmacenPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'almacen')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Almacén" />;
  }
  const access = await loadAlmacenAccess();
  const pedidos = access.pedidos;
  const summary = access.summary;
  const contexts = access.contexts;

  return (
    <PageContainer label={WAREHOUSE_TASK_COPY.title} data-tour={ALMACEN_ACTIONS_TARGET}>
      <PageHeader
        kicker={WAREHOUSE_TASK_COPY.kicker}
        title={WAREHOUSE_TASK_COPY.title}
        description={WAREHOUSE_TASK_COPY.intro}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="manual">{WAREHOUSE_TASK_COPY.notOfficialStock}</StatusPill>
            <StatusPill tone="neutral">Ingreso ≠ asignación</StatusPill>
          </div>
        }
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
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Acción principal: registrar ingreso de producto terminado. No se muestra stock disponible
        sin fuente autoritativa. Los ingresos citados solo confirman un registro vinculado al pedido.
      </p>
      <PedidoWarehouseContextSection rows={contexts} />
      <details className="mt-6 rounded-[var(--isalwa-radius-card)] border border-[var(--isalwa-mist)] bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--isalwa-kiln)]">
          + Registrar ingreso
        </summary>
        <div className="mt-4">
      <WarehousePostSaleDesk
        status={access.status === 'error' ? 'error' : access.status === 'ready' ? 'ready' : 'denied'}
        denial={access.status === 'denied' ? access.reason : null}
        view={access.status === 'ready' ? access.view : null}
        canAllocate={access.status === 'ready' ? access.canAllocate : false}
        canReceive={access.status === 'ready' ? access.canReceive : false}
        pedidos={pedidos}
        initialOrderId={params?.orderId ?? null}
        onReceive={
          access.status === 'ready' && access.canReceive ? receiveFinishedGoodsAction : undefined
        }
      />
        </div>
      </details>
    </PageContainer>
  );
}

function PedidoWarehouseContextSection({ rows }: { rows: PedidoWarehouseContext[] }) {
  const desktopGrid =
    'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto_auto]';
  const headerColumns = [
    { id: 'pedido', label: 'Pedido', className: 'min-w-0' },
    { id: 'client', label: 'Cliente', className: 'min-w-0' },
    { id: 'citation', label: 'Ingreso PT', className: 'min-w-0' },
    { id: 'status', label: 'Estado', className: 'justify-self-end' },
    { id: 'action', label: '', className: 'justify-self-end' },
  ];

  return (
    <OpsDeskSurface className="mb-4">
    <PageSection className="p-0 shadow-none" aria-label="Pedidos con contexto de almacén">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos en Almacén
          </h2>
        }
      />
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Revisión de almacén y citas de ingreso PT por pedido. No implica stock oficial ni asignación.
      </p>
      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Sin pedidos abiertos"
            description="Los pedidos abiertos aparecen aquí. La revisión de almacén se solicita desde el pedido; no se crea sola."
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
                  className="isalwa-t-fast inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
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
                    secondaryActions={reviewAction}
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
