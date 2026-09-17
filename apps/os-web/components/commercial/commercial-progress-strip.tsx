import { ProcessStepIndicator } from '@/components/progress/process-step-indicator';
import type { CommercialProgressStep } from '@/lib/commercial/commercial-progress';
import type { ProcessStep } from '@/lib/progress/process-steps';

type CommercialProgressStripProps = {
  steps: CommercialProgressStep[];
  /** Optional process kicker above the strip. */
  kicker?: string;
};

function toProcessSteps(steps: CommercialProgressStep[]): ProcessStep[] {
  return steps.map((step) => ({
    id: step.id,
    label: step.label,
    state:
      step.state === 'complete' ? 'completed' : step.state === 'current' ? 'current' : 'future',
  }));
}

/**
 * Cliente → Oportunidad → Cotización progress via shared ProcessStepIndicator.
 * No opaque IDs; no false Completion — only deterministic complete/current/upcoming.
 */
export function CommercialProgressStrip({
  steps,
  kicker = 'Proceso comercial',
}: CommercialProgressStripProps) {
  if (steps.length === 0) return null;

  return (
    <ProcessStepIndicator
      className="mb-6"
      title={kicker}
      steps={toProcessSteps(steps)}
    />
  );
}
