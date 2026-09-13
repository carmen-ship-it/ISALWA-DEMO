import Link from 'next/link';
import { EmptyState, PageContainer, PageSection } from '@isalwa/ui';
import { AdminSubNav } from '@/components/admin/admin-sub-nav';
import { MemberList } from '@/components/admin/member-list';
import { MemberSearchForm } from '@/components/admin/member-search-form';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { buildDirectoryLabelMap } from '@/lib/workforce/member-labels';
import { equipoHref } from '@/lib/workforce/navigation';
import type { MemberSearchParams } from '@/lib/workforce/types';
import { classifyQueryError } from '@/lib/work/query-errors';

type EquipoPageProps = {
  searchParams: Promise<MemberSearchParams>;
};

export default async function EquipoPage({ searchParams }: EquipoPageProps) {
  const params = await searchParams;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const allowed = await client.probeAdminAccess();
    if (!allowed) {
      return (
        <PageContainer label="Equipo" className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }

    const q = params.q?.trim();
    const accessStatus = params.accessStatus?.trim();
    const employmentStatus = params.employmentStatus?.trim();
    const departmentId = params.departmentId?.trim();
    const cursor = params.cursor?.trim();

    const result = await client.listMembers({
      ...(q ? { q } : {}),
      ...(accessStatus ? { accessStatus } : {}),
      ...(employmentStatus ? { employmentStatus } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(cursor ? { cursor } : {}),
      limit: 25,
    });

    const labelMap = buildDirectoryLabelMap(result.items);
    const hasFilters = Boolean(q || accessStatus || employmentStatus || departmentId);
    const isEmpty = result.items.length === 0;

    return (
      <PageContainer label="Equipo">
        <PageHeader
          kicker="Administración"
          title="Equipo"
          description="Personas de su empresa con rol, departamento y estado de acceso."
        />

        <AdminSubNav />

        <div className="mt-6">
          <MemberSearchForm
            initialQuery={q}
            initialAccessStatus={accessStatus}
            initialEmploymentStatus={employmentStatus}
          />

          <div className="mt-8">
            {isEmpty ? (
              <EmptyState
                title={hasFilters ? 'Sin resultados' : 'Sin empleados registrados'}
                description={
                  hasFilters
                    ? 'Pruebe con otros filtros o limpie la búsqueda.'
                    : 'Cuando se registren personas en la empresa, aparecerán aquí.'
                }
              />
            ) : (
              <>
                <PageSection card className="p-2 md:p-3">
                  <MemberList items={result.items} labelMap={labelMap} />
                </PageSection>

                {result.meta.hasMore && result.meta.nextCursor ? (
                  <div className="mt-6 flex justify-center">
                    <Link
                      href={equipoHref({
                        q,
                        accessStatus,
                        employmentStatus,
                        departmentId,
                        cursor: result.meta.nextCursor,
                      })}
                      className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-5 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                    >
                      Cargar más
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return (
        <PageContainer label="Equipo" className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Equipo">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
