import { PageContainer, StatusPill } from '@isalwa/ui';
import { ProductionPostSaleDesk } from '@/components/production/production-postsale-desk';
import { PageHeader } from '@/components/shell/page-header';
import { ServiceUnavailableState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { PRODUCTION_PAGE_COPY, PRODUCTION_STEP_LABELS } from '@/lib/production/copy';
import { loadProductionCatalog } from '@/lib/production/load-catalog';
import { createPostSaleExpectedWorkAction } from '@/lib/postsale/actions';
import { loadPostSalePedidos } from '@/lib/postsale/load-pedidos';
import type { PostSalePedidoOption } from '@/lib/postsale/pedido-context';

/** CROSS_LANE: add 'produccionSave' to TOUR_TARGET in lib/walkthrough/targets.ts */
const PRODUCCION_SAVE_TARGET = 'produccion-save';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Post-sale production desk. Pedido is the handoff root for context.
 * Manufacturing annotation remains product-keyed — no Order→ProductionRun invented.
 */
export default async function ProduccionPage() {
  const identity = await loadProductionIdentity();
  const catalog = loadProductionCatalog();
  const pedidos = await loadPedidosSafe();

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
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Seleccione el pedido para heredar cliente, cotización y líneas. La anotación de planta sigue
        el producto; no se inventa un SLA automático de fábrica.
      </p>
      <ol className="mt-4 max-w-2xl space-y-1 text-sm text-[var(--isalwa-kiln)]" aria-label="Pasos de planta">
        {PRODUCTION_STEP_LABELS.map((label, index) => (
          <li key={label}>
            <span className="text-[var(--isalwa-slate)]">{index + 1}.</span> {label}
          </li>
        ))}
      </ol>
      {identity.status === 'error' ? (
        <div className="mt-8">
          <ServiceUnavailableState />
        </div>
      ) : (
        <div className="mt-8">
          <ProductionPostSaleDesk
            status={identity.status}
            organizationId={identity.organizationId}
            memberId={identity.memberId}
            actorLabel={identity.actorLabel}
            grantedScopes={identity.grantedScopes}
            scopesConfirmed={identity.scopesConfirmed}
            catalog={catalog}
            pedidos={pedidos}
            onCreateExpectedWork={createPostSaleExpectedWorkAction}
          />
        </div>
      )}
    </PageContainer>
  );
}

async function loadPedidosSafe(): Promise<PostSalePedidoOption[]> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return [];
    const caps = await loadMemberCapabilities();
    return await loadPostSalePedidos(createOsApiClient(auth), {
      organizationId: caps?.organizationId ?? null,
    });
  } catch {
    return [];
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
