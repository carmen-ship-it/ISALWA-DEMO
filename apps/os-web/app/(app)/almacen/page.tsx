import Link from 'next/link';
import { EmptyState, ListRow, PageContainer, PageSection, SectionHeader, StatGroup, StatusPill } from '@isalwa/ui';
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
        className="mb-6"
        items={[
          { label: 'Revisiones solicitadas', value: String(summary.revisiones) },
          { label: 'Ingresos de producto terminado', value: String(summary.ingresos) },
          { label: 'Pedidos en contexto', value: String(pedidos.length) },
        ]}
      />
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
  return (
    <PageSection card className="mb-6 p-6 md:p-8" aria-label="Pedidos con contexto de almacén">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Pedidos en Almacén
          </h2>
        }
      />
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Revisión de almacén y citas de ingreso PT por pedido. No implica stock oficial ni asignación.
      </p>
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Sin pedidos abiertos"
            description="Los pedidos abiertos aparecen aquí. La revisión de almacén se solicita desde el pedido; no se crea sola."
          />
        </div>
      ) : (
        <ul className="mt-6">
          {rows.map((row) => (
            <ListRow key={row.pedido.orderId} as="li" className="items-start gap-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.pedido.orderLabel}</p>
                  {row.warehouseReviewWorkId ? (
                    <StatusPill tone="warning">Revisión de almacén</StatusPill>
                  ) : null}
                  {row.hasFinishedGoodsCitation ? (
                    <StatusPill tone="info">Ingreso PT citado</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Sin ingreso citado</StatusPill>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.pedido.customerLabel}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {row.warehouseReviewWorkId ? (
                  <Link
                    href={workItemHref(row.warehouseReviewWorkId)}
                    className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                  >
                    Ver revisión
                  </Link>
                ) : null}
                <Link
                  href={orderHref(row.pedido.partyId, row.pedido.orderId)}
                  className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
                >
                  Abrir pedido
                </Link>
              </div>
            </ListRow>
          ))}
        </ul>
      )}
    </PageSection>
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
      };
    }

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
      });
      try {
        postsalePedidos = await loadPostSalePedidos(client, {
          organizationId: context.organizationId,
          dataMode,
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
    };
  } catch {
    return {
      status: 'error' as const,
      pedidos: NO_POSTSALE_PEDIDOS,
      summary: emptySummary,
      contexts: emptyContexts,
    };
  }
}
