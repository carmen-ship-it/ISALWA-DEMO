import { PageContainer, StatusPill } from '@isalwa/ui';
import { CoordinationPanel } from '@/components/coordination/coordination-panel';
import { PageHeader } from '@/components/shell/page-header';
import { loadCoordinationPage } from '@/lib/coordination/load';

/** CROSS_LANE: add 'coordinationHistory' to TOUR_TARGET in lib/walkthrough/targets.ts */
const COORDINATION_HISTORY_TARGET = 'coordination-history';

export default async function CoordinacionPage() {
  const model = await loadCoordinationPage();

  return (
    <PageContainer label="Coordinación" data-tour={COORDINATION_HISTORY_TARGET}>
      <PageHeader
        kicker="Asuntos que necesitan una decisión"
        title="Coordinación"
        description="Coordinación aún no registra decisiones operativas de forma persistente."
        action={<StatusPill tone="neutral">Aún no disponible</StatusPill>}
      />
      <CoordinationPanel model={model} />
    </PageContainer>
  );
}
