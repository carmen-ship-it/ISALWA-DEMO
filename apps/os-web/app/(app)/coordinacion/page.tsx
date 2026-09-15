import { PageContainer, StatusPill } from '@isalwa/ui';
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
        description="Solo lo que cruza áreas y necesita una decisión. No es un calendario de reuniones."
        action={
          model.canRecord ? (
            <StatusPill tone="info">Puede registrar</StatusPill>
          ) : (
            <StatusPill tone="neutral">Solo lectura</StatusPill>
          )
        }
      />
      <CoordinationPanel model={model} />
    </PageContainer>
  );
}
