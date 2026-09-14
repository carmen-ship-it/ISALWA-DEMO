import { PageContainer } from '@isalwa/ui';
import { ProductionWorkspace } from '@/components/production/production-workspace';
import { PageHeader } from '@/components/shell/page-header';
import { ServiceUnavailableState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { PRODUCTION_PAGE_COPY, PRODUCTION_STEP_LABELS } from '@/lib/production/copy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Manufacturing workspace. Not a Pedido page.
 * Una quema no es un pedido y no pertenece a un pedido.
 * Un ingreso al Almacén de Productos Terminados no asigna un pedido.
 */
export default async function ProduccionPage() {
  const identity = await loadProductionIdentity();

  return (
    <PageContainer label="Producción">
      <PageHeader
        kicker={PRODUCTION_PAGE_COPY.kicker}
        title={PRODUCTION_PAGE_COPY.title}
        description={PRODUCTION_PAGE_COPY.intro}
      />
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Una quema no es un pedido y no pertenece a un pedido. Puede reunir varios identificadores de producto.
      </p>
      <ol className="mt-4 max-w-2xl space-y-1 text-sm text-[var(--isalwa-kiln)]">
        {PRODUCTION_STEP_LABELS.map((label, index) => (
          <li key={label}>
            <span className="text-[var(--isalwa-slate)]">{index + 1}.</span> {label}
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Un ingreso al Almacén de Productos Terminados no asigna un pedido.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-[var(--isalwa-slate)]">
        Laboratorio (preparación de materia prima y esmalte). Molienda. Colaje. Secado. Pulido. Esmaltado. Carga y Limpieza. Horno. Resane. Clasificación. Almacén de Productos Terminados.
      </p>
      {identity.status === 'error' ? (
        <div className="mt-8">
          <ServiceUnavailableState />
        </div>
      ) : (
        <div className="mt-8">
          <ProductionWorkspace
            status={identity.status}
            organizationId={identity.organizationId}
            memberId={identity.memberId}
            actorLabel={identity.actorLabel}
            grantedScopes={identity.grantedScopes}
            scopesConfirmed={identity.scopesConfirmed}
            catalog={null}
            productionInternalDate={null}
          />
        </div>
      )}
    </PageContainer>
  );
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
    const auth = await getServerOsAuthContext();
    if (!auth) {
      return {
        status: 'permission',
        organizationId: null,
        memberId: null,
        actorLabel: 'Operación de planta',
        grantedScopes: [],
        scopesConfirmed: false,
      };
    }
    const session = await createOsApiClient(auth).getAuthenticatedSession();
    const organizationId = session.organizationId?.trim() || null;
    const memberId = session.memberId?.trim() || null;
    return {
      status: organizationId && memberId ? 'ready' : 'permission',
      organizationId,
      memberId,
      actorLabel: 'Operación de planta',
      grantedScopes: [],
      scopesConfirmed: false,
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
