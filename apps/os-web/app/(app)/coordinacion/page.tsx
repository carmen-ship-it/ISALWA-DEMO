import { PageContainer } from '@isalwa/ui';
import { CoordinationPanel } from '@/components/coordination/coordination-panel';
import { PageHeader } from '@/components/shell/page-header';
import { loadCoordinationPage } from '@/lib/coordination/load';

export default async function CoordinacionPage() {
  const model = await loadCoordinationPage();

  return (
    <PageContainer label="Coordinación">
      <PageHeader
        kicker="Asuntos que necesitan una decisión"
        title="Coordinación"
        description="Asuntos que cruzan áreas y necesitan una decisión, tomados de los hechos que ya existen."
      />
      <CoordinationPanel model={model} />
    </PageContainer>
  );
}
