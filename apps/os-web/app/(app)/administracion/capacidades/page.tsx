import { PageContainer, PageSection } from '@isalwa/ui';
import { AdminSubNav } from '@/components/admin/admin-sub-nav';
import { CapabilityList } from '@/components/admin/capability-list';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { equipoHref } from '@/lib/workforce/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

export default async function CapacidadesPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const allowed = await client.probeAdminAccess();
    if (!allowed) {
      return (
        <PageContainer label="Capacidades" className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }

    const { capabilities } = await client.getCapabilityState();

    return (
      <PageContainer label="Capacidades">
        <PageHeader
          kicker="Administración"
          title="Capacidades"
          description="Qué partes del sistema están disponibles para su empresa."
        />

        <AdminSubNav />

        <PageSection card className="mt-6 p-6">
          <CapabilityList items={capabilities} />
        </PageSection>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return (
        <PageContainer label="Capacidades" className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Capacidades">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
