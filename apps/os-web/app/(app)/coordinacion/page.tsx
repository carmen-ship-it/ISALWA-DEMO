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
        description="Solo lo que cruza áreas y necesita una decisión. No es un calendario de reuniones."
        action={
          model.canRecord ? (
            <a
              href="#registrar-coordinacion"
              className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-kiln)] px-4 text-sm font-medium text-white"
            >
              + Registrar asunto de coordinación
            </a>
          ) : (
            <StatusPill tone="neutral">Solo lectura</StatusPill>
          )
        }
      />
      <CoordinationPanel model={model} />
    </PageContainer>
  );
}
