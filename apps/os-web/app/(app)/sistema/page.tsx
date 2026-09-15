import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
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
      />

      <div className="mt-10 space-y-8">
        <PageSection card className="p-8">
          <SectionHeader title="Qué autoriza system.admin" />
          <ul className="mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
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

        <PageSection card className="p-8">
          <SectionHeader title="Disponible hoy" />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Este panel confirma que su sesión tiene controles técnicos autorizados. Las herramientas
            operativas de infraestructura se habilitan aquí cuando existan; no se muestran botones a
            destinos que aún no puede usar.
          </p>
        </PageSection>
      </div>
    </PageContainer>
  );
}
