import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
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
      />

      <AdminSubNav />

      <div className="mt-10 space-y-8">
        <AdminSectionCards />

        <PageSection card className="p-8">
          <SectionHeader title="Equipo y accesos" />
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
