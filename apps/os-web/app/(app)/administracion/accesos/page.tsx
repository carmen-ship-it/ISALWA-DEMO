import Link from 'next/link';
import { PageContainer, PageSection } from '@isalwa/ui';
import { AdminSubNav } from '@/components/admin/admin-sub-nav';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { formatAccessStatus } from '@/lib/workforce/labels';
import { equipoHref } from '@/lib/workforce/navigation';

export default async function AccesosPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const allowed = await client.probeAdminAccess();

  if (!allowed) {
    return (
      <PageContainer label="Accesos" className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  return (
    <PageContainer label="Accesos">
      <PageHeader
        kicker="Administración"
        title="Accesos"
        description="Estado de acceso de cada empleado al sistema."
      />

      <AdminSubNav />

      <PageSection card className="mt-10 p-8">
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          El estado de acceso de cada persona se consulta en{' '}
          <Link href={equipoHref()} className="font-medium text-[var(--isalwa-glaze)] hover:underline">
            Equipo
          </Link>
          . Use los filtros por acceso para ver personas activas, suspendidas o con acceso
          revocado.
        </p>
        <ul className="mt-8 max-w-2xl space-y-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          <li>
            <strong className="text-[var(--isalwa-kiln)]">{formatAccessStatus('active')}</strong>
            {' — '}puede iniciar sesión con normalidad.
          </li>
          <li>
            <strong className="text-[var(--isalwa-kiln)]">{formatAccessStatus('suspended')}</strong>
            {' — '}acceso temporalmente bloqueado; la relación laboral puede seguir activa.
          </li>
          <li>
            <strong className="text-[var(--isalwa-kiln)]">{formatAccessStatus('revoked')}</strong>
            {' — '}acceso revocado de forma permanente, usualmente tras finalizar la relación.
          </li>
        </ul>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Para cambiar accesos, abra el detalle del empleado en{' '}
          <Link href={equipoHref()} className="font-medium text-[var(--isalwa-glaze)] hover:underline">
            Equipo
          </Link>
          . Las acciones disponibles dependen del estado de acceso y relación laboral.
        </p>
      </PageSection>
    </PageContainer>
  );
}
