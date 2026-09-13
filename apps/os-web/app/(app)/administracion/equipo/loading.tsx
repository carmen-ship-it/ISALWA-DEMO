import { PageContainer } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';

export default function EquipoLoading() {
  return (
    <PageContainer label="Equipo">
      <PageHeader kicker="Administración" title="Equipo" />
      <p className="text-sm text-[var(--isalwa-slate)]">Cargando equipo…</p>
    </PageContainer>
  );
}
