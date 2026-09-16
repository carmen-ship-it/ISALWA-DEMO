import { PageContainer, StatusPill } from '@isalwa/ui';
import { WarehousePostSaleDesk } from '@/components/warehouse/warehouse-postsale-desk';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { receiveFinishedGoodsAction } from '@/lib/postsale/actions';
import { loadPostSalePedidos } from '@/lib/postsale/load-pedidos';
import type { PostSalePedidoOption } from '@/lib/postsale/pedido-context';
import { loadWarehousePedidosFromOrders } from '@/lib/warehouse/load-pedidos';
import { WAREHOUSE_TASK_COPY, resolveWarehousePageAccess } from '@/lib/warehouse';

/** CROSS_LANE: add 'almacenActions' to TOUR_TARGET in lib/walkthrough/targets.ts */
const ALMACEN_ACTIONS_TARGET = 'almacen-actions';

const NO_POSTSALE_PEDIDOS: PostSalePedidoOption[] = [];

export default async function AlmacenPage() {
  const access = await loadAlmacenAccess();
  const pedidos = access.pedidos;

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
  try {
    const context = await loadMemberCapabilities();
    if (!context) {
      return {
        ...resolveWarehousePageAccess({ session: null, grantedScopes: null }),
        pedidos: NO_POSTSALE_PEDIDOS,
      };
    }

    let warehousePedidos: Awaited<ReturnType<typeof loadWarehousePedidosFromOrders>> = [];
    let postsalePedidos: PostSalePedidoOption[] = NO_POSTSALE_PEDIDOS;
    const auth = await getServerOsAuthContext();
    if (auth) {
      const client = createOsApiClient(auth);
      warehousePedidos = await loadWarehousePedidosFromOrders(client);
      try {
        postsalePedidos = await loadPostSalePedidos(client);
      } catch {
        postsalePedidos = NO_POSTSALE_PEDIDOS;
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

    return { ...resolved, pedidos: postsalePedidos };
  } catch {
    return { status: 'error' as const, pedidos: NO_POSTSALE_PEDIDOS };
  }
}
