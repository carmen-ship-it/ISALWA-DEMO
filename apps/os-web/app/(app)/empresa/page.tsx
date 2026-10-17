import { PageContainer } from '@isalwa/ui';
import { OrganizationChooser } from '@/components/auth/organization-chooser';
import { PageHeader } from '@/components/shell/page-header';
import { loadShellContext } from '@/lib/shell/load-shell-context';

export const dynamic = 'force-dynamic';

export default async function EmpresaPage() {
  const shell = await loadShellContext();
  const organizations = shell?.organizations ?? [];

  return (
    <PageContainer label="Cambiar empresa">
      <PageHeader
        kicker="Cuenta"
        title="Cambiar empresa"
        description="Solo aparecen las empresas donde su acceso está activo. Al cambiar, la vista se recarga sin datos de la empresa anterior."
      />
      <div className="flex justify-center">
        <OrganizationChooser
          organizations={organizations}
          currentOrganizationId={shell?.currentOrganizationId ?? null}
        />
      </div>
    </PageContainer>
  );
}
