import Link from 'next/link';
import { Button, PageContainer } from '@isalwa/ui';
import { AdminSubNav } from '@/components/admin/admin-sub-nav';
import { InviteMemberForm } from '@/components/admin/invite-member-form';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberAdminOptions } from '@/lib/workforce/admin-options';
import { INVITE_EMPLOYEE_ACTION_LABEL, inviteEmployeeVisible } from '@/lib/workforce/invite';
import { equipoHref } from '@/lib/workforce/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

export default async function InviteMemberPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const peopleAdmin = await client.probeAdminAccess();
    if (!inviteEmployeeVisible({ peopleAdmin })) {
      return (
        <PageContainer label={INVITE_EMPLOYEE_ACTION_LABEL} className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }

    const options = await loadMemberAdminOptions(client, '');

    return (
      <PageContainer label={INVITE_EMPLOYEE_ACTION_LABEL}>
        <PageHeader
          kicker="Equipo"
          title={INVITE_EMPLOYEE_ACTION_LABEL}
          description="Registre a una persona de su empresa. Esta pantalla no crea una contraseña ni activa la cuenta. La persona debe completar el acceso en el correo que envía el proveedor de acceso."
          action={
            <Link href={equipoHref()}>
              <Button type="button" variant="secondary">
                Volver al equipo
              </Button>
            </Link>
          }
        />

        <AdminSubNav />

        <div className="mt-10">
          <InviteMemberForm departments={options.departments} roles={options.roles} />
        </div>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return (
        <PageContainer label={INVITE_EMPLOYEE_ACTION_LABEL} className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label={INVITE_EMPLOYEE_ACTION_LABEL}>
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
