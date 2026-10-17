import { PageContainer } from '@isalwa/ui';
import { SessionGuard } from '@/components/shell/session-guard';
import { AppShell } from '@/components/shell/app-shell';
import { ShellNotificationSlot } from '@/components/shell/shell-notification-slot';
import {
  AccessDeniedState,
  AccountInactiveState,
  NoOrganizationState,
  ServiceUnavailableState,
  SessionExpiredState,
} from '@/components/states/app-states';
import { OrganizationChooser } from '@/components/auth/organization-chooser';
import { QaViewBanner } from '@/components/qa/qa-view-banner';
import { loadShellContext } from '@/lib/shell/load-shell-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadShellContext();

  if (!shell || shell.osAccess === 'unauthorized') {
    return (
      <PageContainer label="Sesión vencida" className="flex min-h-screen items-center justify-center">
        <SessionExpiredState />
      </PageContainer>
    );
  }

  if (shell.osAccess === 'revoked') {
    return (
      <PageContainer label="Cuenta desactivada" className="flex min-h-screen items-center justify-center">
        <AccountInactiveState />
      </PageContainer>
    );
  }

  if (shell.osAccess === 'denied') {
    return (
      <PageContainer label="Sin acceso" className="flex min-h-screen items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  if (shell.osAccess === 'no-organization') {
    return (
      <PageContainer label="Sin empresa" className="flex min-h-screen items-center justify-center">
        <NoOrganizationState />
      </PageContainer>
    );
  }

  if (shell.osAccess === 'choose-organization') {
    return (
      <PageContainer label="Elegir empresa" className="flex min-h-screen items-center justify-center">
        <OrganizationChooser organizations={shell.organizations} />
      </PageContainer>
    );
  }

  if (shell.osAccess === 'unavailable') {
    return (
      <PageContainer label="Servicio no disponible" className="flex min-h-screen items-center justify-center">
        <ServiceUnavailableState />
      </PageContainer>
    );
  }

  return (
    <>
      <QaViewBanner />
      <SessionGuard />
      <AppShell
        displayLabel={shell.displayLabel}
        givenName={shell.givenName}
        showAdmin={shell.showAdmin}
        canCreateCustomer={shell.canCreateCustomer}
        actorKey={shell.actorKey}
        grantedScopes={shell.grantedScopes}
        capabilities={shell.capabilities}
        asesorOptions={shell.asesorOptions}
        canSwitchOrganization={shell.organizations.length > 1}
        notificationSlot={<ShellNotificationSlot />}
      >
        {children}
      </AppShell>
    </>
  );
}
