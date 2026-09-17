import { PageContainer, StatGroup, StatusPill } from '@isalwa/ui';
import { WarehousePostSaleDesk } from '@/components/warehouse/warehouse-postsale-desk';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { receiveFinishedGoodsAction } from '@/lib/postsale/actions';
import { loadPostSalePedidos } from '@/lib/postsale/load-pedidos';
import type { PostSalePedidoOption } from '@/lib/postsale/pedido-context';
import { loadWarehousePedidosFromOrders } from '@/lib/warehouse/load-pedidos';
import { WAREHOUSE_TASK_COPY, resolveWarehousePageAccess } from '@/lib/warehouse';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';

/** CROSS_LANE: add 'almacenActions' to TOUR_TARGET in lib/walkthrough/targets.ts */
const ALMACEN_ACTIONS_TARGET = 'almacen-actions';

const NO_POSTSALE_PEDIDOS: PostSalePedidoOption[] = [];

export default async function AlmacenPage() {
  const access = await loadAlmacenAccess();
  const pedidos = access.pedidos;
  const summary = access.summary;

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
        sin fuente autoritativa.
      </p>
      <WarehousePostSaleDesk
        status={access.status === 'error' ? 'error' : access.status === 'ready' ? 'ready' : 'denied'}
        denial={access.status === 'denied' ? access.reason : null}
        view={access.status === 'ready' ? access.view : null}
        canAllocate={access.status === 'ready' ? access.canAllocate : false}
        canReceive={access.status === 'ready' ? access.canReceive : false}
        pedidos={pedidos}
        onReceive={
          access.status === 'ready' && access.canReceive ? receiveFinishedGoodsAction : undefined
        }
      />
    </PageContainer>
  );
}

async function loadAlmacenAccess() {
  const emptySummary = { revisiones: 0, ingresos: 0 };
  try {
    const context = await loadMemberCapabilities();
    if (!context) {
      return {
        ...resolveWarehousePageAccess({ session: null, grantedScopes: null }),
        pedidos: NO_POSTSALE_PEDIDOS,
        summary: emptySummary,
      };
    }

    let warehousePedidos: Awaited<ReturnType<typeof loadWarehousePedidosFromOrders>> = [];
    let postsalePedidos: PostSalePedidoOption[] = NO_POSTSALE_PEDIDOS;
    let revisiones = 0;
    const auth = await getServerOsAuthContext();
    if (auth) {
      const client = createOsApiClient(auth);
      const dataMode = await resolveDemoDataMode({});
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
      try {
        const workPage = await client.listWorkItems({ status: 'open', limit: 100 });
        for (const pedido of postsalePedidos) {
          const open = findOpenOrderPrepReviews(
            workPage.items ?? [],
            pedido.orderId,
            pedido.partyId,
          );
          if (open.warehouse) revisiones += 1;
        }
      } catch {
        revisiones = 0;
      }
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

    const ingresos =
      resolved.status === 'ready' ? resolved.view?.waiting.length ?? 0 : 0;

    return {
      ...resolved,
      pedidos: postsalePedidos,
      summary: { revisiones, ingresos },
    };
  } catch {
    return { status: 'error' as const, pedidos: NO_POSTSALE_PEDIDOS, summary: emptySummary };
  }
}
