import { PageContainer, StatGroup, StatusPill } from '@isalwa/ui';
import { ProductionOpsTable, type ProductionOpsRow } from '@/components/production/production-ops-table';
import { ListCapNotice } from '@/components/lists/list-cap-notice';
import { ProductionPostSaleDesk } from '@/components/production/production-postsale-desk';
import { PageHeader } from '@/components/shell/page-header';
import { ServiceUnavailableState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { PRODUCTION_PAGE_COPY } from '@/lib/production/copy';
import { loadProductionCatalog } from '@/lib/production/load-catalog';
import {
  findOpenProductionUpdateRequest,
} from '@/lib/production/update-request-work';
import { createPostSaleExpectedWorkAction } from '@/lib/postsale/actions';
import { loadPostSalePedidos } from '@/lib/postsale/load-pedidos';
import type { PostSalePedidoOption } from '@/lib/postsale/pedido-context';
import { findOpenOrderPrepReviews } from '@/components/commercial/order-prep-work';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { pushListCap, type ListCap } from '@/lib/lists/list-cap';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

/** CROSS_LANE: add 'produccionSave' to TOUR_TARGET in lib/walkthrough/targets.ts */
const PRODUCCION_SAVE_TARGET = 'produccion-save';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Post-sale production desk. Pedido is the handoff root for context.
 * Manufacturing annotation remains product-keyed — no Order→ProductionRun invented.
 */
export default async function ProduccionPage({
  searchParams,
}: {
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'produccion')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Producción" />;
  }

  const identity = await loadProductionIdentity();
  const catalog = loadProductionCatalog();
  const { pedidos, rows, summary, listCaps } = await loadProductionDeskData();
  const canMutate = !evaluation.active && identity.status === 'ready';

  return (
    <PageContainer label="Producción" data-tour={PRODUCCION_SAVE_TARGET}>
      <PageHeader
        kicker={PRODUCTION_PAGE_COPY.kicker}
        title={PRODUCTION_PAGE_COPY.title}
        description={PRODUCTION_PAGE_COPY.intro}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="info">Pedido como contexto</StatusPill>
            <StatusPill tone="manual">Anotación confirmada</StatusPill>
          </div>
        }
      />
      <StatGroup
        className="mb-6"
        items={[
          { label: 'Revisiones solicitadas', value: String(summary.revisiones) },
          { label: 'Actualizaciones recientes', value: String(summary.actualizaciones) },
          { label: 'Pedidos en cola', value: String(pedidos.length) },
        ]}
      />
      <ProductionOpsTable
        rows={rows}
        actorMemberId={identity.memberId}
        canMutate={canMutate}
      />
      <ListCapNotice caps={listCaps} />
      <p className="mb-4 mt-8 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Seleccione el pedido para heredar cliente, cotización y líneas. La anotación sigue el
        producto; no hay SLA automático de fábrica.
      </p>
      {identity.status === 'error' ? (
        <div className="mt-6">
          <ServiceUnavailableState />
        </div>
      ) : evaluation.active ? (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
          Vista de evaluación: solo lectura. Las anotaciones de producción están deshabilitadas.
        </p>
      ) : (
        <details className="mt-6 rounded-[var(--isalwa-radius-card)] border border-[var(--isalwa-mist)] bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--isalwa-kiln)]">
            + Registrar actualización
          </summary>
          <div className="mt-4">
            <ProductionPostSaleDesk
              status={identity.status}
              organizationId={identity.organizationId}
              memberId={identity.memberId}
              actorLabel={identity.actorLabel}
              grantedScopes={identity.grantedScopes}
              scopesConfirmed={identity.scopesConfirmed}
              catalog={catalog}
              pedidos={pedidos}
              initialOrderId={params?.orderId ?? null}
              onCreateExpectedWork={createPostSaleExpectedWorkAction}
            />
          </div>
        </details>
      )}
    </PageContainer>
  );
}

async function loadProductionDeskData(): Promise<{
  pedidos: PostSalePedidoOption[];
  rows: ProductionOpsRow[];
  summary: { revisiones: number; actualizaciones: number };
  listCaps: ListCap[];
}> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) {
      return { pedidos: [], rows: [], summary: { revisiones: 0, actualizaciones: 0 }, listCaps: [] };
    }
    const caps = await loadMemberCapabilities();
    const client = createOsApiClient(auth);
    const dataMode = await resolveDemoDataMode({});
    const listCaps: ListCap[] = [];
    const pedidos = await loadPostSalePedidos(client, {
      organizationId: caps?.organizationId ?? null,
      dataMode,
      listCaps,
    });

    let workItems: Awaited<ReturnType<typeof client.listWorkItems>>['items'] = [];
    try {
      const workPage = await client.listWorkItems({ status: 'open', limit: 100 });
      workItems = workPage.items ?? [];
      pushListCap(listCaps, workPage, 100);
    } catch {
      workItems = [];
    }

    let revisiones = 0;
    let actualizaciones = 0;
    const rows: ProductionOpsRow[] = pedidos.map((pedido) => {
      const prep = findOpenOrderPrepReviews(workItems, pedido.orderId, pedido.partyId);
      if (prep.production) revisiones += 1;
      const openUpdate = findOpenProductionUpdateRequest(workItems, pedido.orderId);
      if (openUpdate) actualizaciones += 1;

      return {
        pedido,
        requestedAction: prep.production
          ? 'Revisión de producción abierta'
          : openUpdate
            ? 'Actualización solicitada'
            : 'Sin solicitud abierta',
        lastUpdateLabel: pedido.statusLabel ?? 'Sin último hecho de planta',
        responsibleLabel: pedido.ownerLabel ?? 'Sin responsable canónico',
        dateLabel: '—',
        nextAction: prep.production
          ? 'Completar revisión de producción'
          : openUpdate
            ? 'Esperar respuesta de producción'
            : 'Solicitar actualización si el cliente pregunta',
        openUpdate,
        openProductionReviewWorkId: prep.production?.workItemId ?? null,
        productionOwnerMemberId: null,
      };
    });

    return {
      pedidos,
      rows,
      summary: { revisiones, actualizaciones },
      listCaps,
    };
  } catch {
    return { pedidos: [], rows: [], summary: { revisiones: 0, actualizaciones: 0 }, listCaps: [] };
  }
}

async function loadProductionIdentity(): Promise<{
  status: 'ready' | 'permission' | 'error';
  organizationId: string | null;
  memberId: string | null;
  actorLabel: string;
  grantedScopes: readonly string[];
  scopesConfirmed: boolean;
}> {
  try {
    const context = await loadMemberCapabilities();
    if (!context) {
      return {
        status: 'permission',
        organizationId: null,
        memberId: null,
        actorLabel: 'Operación de planta',
        grantedScopes: [],
        scopesConfirmed: false,
      };
    }
    return {
      status: 'ready',
      organizationId: context.organizationId,
      memberId: context.memberId,
      actorLabel: 'Operación de planta',
      grantedScopes: context.grantedScopes,
      scopesConfirmed: true,
    };
  } catch {
    return {
      status: 'error',
      organizationId: null,
      memberId: null,
      actorLabel: 'Operación de planta',
      grantedScopes: [],
      scopesConfirmed: false,
    };
  }
}
