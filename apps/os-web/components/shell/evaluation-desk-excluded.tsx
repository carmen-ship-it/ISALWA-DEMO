import { EmptyState, PageContainer } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { rolePreviewPresetLabel } from '@/lib/role-preview/presets';
import type { EvaluationProjection } from '@/lib/role-preview/evaluation-projection';

/** Shown when Vista de evaluación excludes this desk from the active persona. */
export function EvaluationDeskExcluded({
  evaluation,
  deskLabel,
}: {
  evaluation: EvaluationProjection;
  deskLabel: string;
}) {
  const role = rolePreviewPresetLabel(evaluation.persona);
  return (
    <PageContainer label={deskLabel}>
      <PageHeader kicker="Vista de evaluación" title={deskLabel} />
      <EmptyState
        title="Fuera de esta proyección"
        description={`${role} no incluye ${deskLabel.toLowerCase()} en la proyección de evaluación. Vuelva a la vista de propietario para el panorama completo.`}
      />
    </PageContainer>
  );
}
