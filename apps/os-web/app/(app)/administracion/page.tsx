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
        description="Consulte y administre el equipo, los accesos y la disponibilidad del sistema."
      />

      <AdminSubNav />

      <div className="mt-6 space-y-6">
        <AdminSectionCards />

        <PageSection card className="p-6">
          <SectionHeader title="Acciones de administración" />
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Desde{' '}
            <Link href={equipoHref()} className="font-medium text-[var(--isalwa-glaze)] hover:underline">
              Equipo
            </Link>
            {' '}puede cambiar departamento, rol, responsable, suspender o reactivar acceso,
            finalizar relaciones y gestionar delegaciones según el estado de cada empleado.
          </p>
        </PageSection>
      </div>
    </PageContainer>
  );
}
