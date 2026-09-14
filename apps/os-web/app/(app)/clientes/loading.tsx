import { PageContainer } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';

export default function ClientesLoading() {
  return (
    <PageContainer label="Clientes">
      <PageHeader kicker="Relaciones" title="Clientes" />
      <p className="text-sm text-[var(--isalwa-slate)]">Cargando clientes…</p>
    </PageContainer>
  );
}
