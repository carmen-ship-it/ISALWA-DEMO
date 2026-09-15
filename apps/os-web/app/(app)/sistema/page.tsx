import { PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import {
  SYSTEM_ADMIN_MEANING,
  mayOpenSystemControls,
} from '@/lib/roles/system-controls';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Technical system controls for system.admin only.
 * Fail-closed. Does not open people.admin Equipo / Accesos / Capacidades.
 */
export default async function SistemaPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const grantedScopes = await loadActorRoleKeys(client);
  const allowed = mayOpenSystemControls(grantedScopes);

  if (!allowed) {
    return (
      <PageContainer label="Controles del sistema" className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  return (
    <PageContainer label="Controles del sistema">
      <PageHeader
        kicker="Sistema"
        title="Controles del sistema"
        description="Capa técnica de la empresa. Separada de la lectura de negocio y de la administración de personas."
        action={<StatusPill tone="success">Autorizado</StatusPill>}
      />

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <PageSection
          card
          className="border-[color-mix(in_srgb,var(--isalwa-glaze)_12%,var(--isalwa-mist))] p-6 shadow-[var(--isalwa-shadow-resting)] md:p-8"
        >
          <SectionHeader kicker="Alcance" title="Qué autoriza system.admin" />
          <ul className="mt-2 max-w-2xl space-y-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            <li>
              Autoridad técnica explícita ({SYSTEM_ADMIN_MEANING.scope}), acotada a la organización de la
              sesión.
            </li>
            <li>No reescribe historial ni abre salud de integraciones.</li>
            <li>
              No implica administración de personas (people.admin). Equipo, accesos e invitaciones
              siguen en Administración solo con esa autoridad.
            </li>
          </ul>
        </PageSection>

        <div className="space-y-6">
          <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)] p-6 shadow-[var(--isalwa-shadow-soft)] md:p-7">
            <p className="isalwa-section-label">Disponible hoy</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Este panel confirma que su sesión tiene controles técnicos autorizados. Las herramientas
              operativas de infraestructura se habilitan aquí cuando existan; no se muestran botones a
              destinos que aún no puede usar.
            </p>
          </div>
          <PageSection card className="p-6 md:p-7">
            <SectionHeader title="Separación" />
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Personas y accesos viven en Administración. Aquí solo la capa técnica — sin inventar
              consoles vacías.
            </p>
          </PageSection>
        </div>
      </div>
    </PageContainer>
  );
}
