import { PageContainer, StatGroup } from '@isalwa/ui';
import { ProductionOpsTable, type ProductionOpsRow } from '@/components/production/production-ops-table';
import { ListCapNotice } from '@/components/lists/list-cap-notice';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { ProductionPostSaleDesk } from '@/components/production/production-postsale-desk';
import { OpsDeskInfoBanner } from '@/components/production/ops-desk-info-banner';
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
import {
  matchesOpsSearch,
  opsBoundedPageHrefs,
  opsListHref,
  parseListQuery,
  windowFilteredOpsCollection,
} from '@/lib/lists/ops-collection';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

/** CROSS_LANE: add 'produccionSave' to TOUR_TARGET in lib/walkthrough/targets.ts */
const PRODUCCION_SAVE_TARGET = 'produccion-save';
const LIST_PATH = '/produccion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Post-sale production desk. Pedido is the handoff root for context.
 * Manufacturing annotation remains product-keyed — no Order→ProductionRun invented.
 */
export default async function ProduccionPage({
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
  if (!evaluationAllowsDesk(evaluation, 'produccion')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Producción" />;
  }

  const identity = await loadProductionIdentity();
  const catalog = loadProductionCatalog();
  const { pedidos, rows, summary, listCaps } = await loadProductionDeskData();
  const canMutate = !evaluation.active && identity.status === 'ready';

  const windowed = windowFilteredOpsCollection(rows, {
    q: listState.q,
    pagina: listState.pagina,
    match: (row, q) =>
      matchesOpsSearch(q, [
        row.pedido.orderLabel,
        row.pedido.customerLabel,
        row.pedido.orderId,
        row.requestedAction,
        row.responsibleLabel,
      ]),
  });
  const pageLinks = opsBoundedPageHrefs(
    LIST_PATH,
    { ...listState, pagina: undefined },
    windowed.page,
    windowed.pageCount,
    extras,
  );
  const searchAction = opsListHref(LIST_PATH, { ...listState, q: undefined, pagina: undefined }, extras);

  return (
    <PageContainer label="Producción" data-tour={PRODUCCION_SAVE_TARGET}>
      <PageHeader
        kicker={PRODUCTION_PAGE_COPY.kicker}
        title={PRODUCTION_PAGE_COPY.title}
        description={PRODUCTION_PAGE_COPY.intro}
      />
      <StatGroup
        className="mb-4"
        items={[
          { label: 'Revisiones solicitadas', value: String(summary.revisiones) },
          { label: 'Actualizaciones recientes', value: String(summary.actualizaciones) },
          { label: 'Pedidos en cola', value: String(pedidos.length) },
        ]}
      />
      <OpsDeskInfoBanner
        columns={[
          { label: 'Contexto', value: 'Pedido hereda cliente, cotización y líneas.' },
          { label: 'Anotación', value: 'Sigue el producto; no hay SLA automático de fábrica.' },
          { label: 'Ingreso PT', value: PRODUCTION_PAGE_COPY.listoMeaning },
        ]}
      />
      <form
        method="get"
        action={LIST_PATH}
        className="mb-4 flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Buscar pedidos de producción"
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
          className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-sm font-medium text-[var(--isalwa-kiln)]"
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
      <ProductionOpsTable
        rows={windowed.items}
        actorMemberId={identity.memberId}
        canMutate={canMutate}
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
      <ListCapNotice caps={listCaps} />
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
              initialOrderId={selectedOrderId}
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
