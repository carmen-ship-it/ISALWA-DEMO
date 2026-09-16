import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { AdminSectionCards, AdminSubNav } from '@/components/admin/admin-sub-nav';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';
import { equipoHref } from '@/lib/workforce/navigation';

export default async function AdministracionPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const allowed = await client.probeAdminAccess();

  if (!allowed) {
    return (
      <PageContainer label={t('pages.administracion.title')} className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  return (
    <PageContainer label={t('pages.administracion.title')}>
      <PageHeader
        kicker={t('pages.administracion.kicker')}
        title={t('pages.administracion.title')}
        description="Equipo, accesos y lo que la empresa tiene habilitado. El trabajo del día permanece en Clientes y en Trabajo."
        action={<StatusPill tone="neutral">Configuración de empresa</StatusPill>}
      />

      <AdminSubNav />

      <PageSection
        card
        className="mt-6 border-[color-mix(in_srgb,var(--isalwa-glaze)_10%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_45%,white)] p-5 shadow-[var(--isalwa-shadow-soft)] md:p-6"
      >
        <SectionHeader kicker="Alcance" title="Qué hace este espacio" />
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Aquí se gobierna quién entra, con qué rol y qué capacidades tiene la organización — no el
          flujo operativo del día. Invitar o suspender acceso no mueve pedidos ni cotizaciones por
          sí solo.
        </p>
      </PageSection>

      <div className="mt-10 space-y-8">
        <AdminSectionCards />

        <PageSection
          card
          className="bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] p-6 shadow-[var(--isalwa-shadow-soft)] md:p-8"
        >
          <SectionHeader kicker="Personas" title="Equipo y accesos" />
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Desde{' '}
            <Link href={equipoHref()} className="font-medium text-[var(--isalwa-glaze)] hover:underline">
              Equipo
            </Link>
            {' '}puede invitar a una persona, ajustar departamento, rol o responsable, y suspender,
            reactivar o finalizar el acceso según su estado. La invitación no crea una contraseña
            ni asigna administración por sí sola.
          </p>
        </PageSection>
      </div>
    </PageContainer>
  );
}
