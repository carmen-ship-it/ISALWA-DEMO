import { cx } from '@isalwa/ui';
import type { ProcessStep, ProcessStepState } from '@/lib/progress/process-steps';

type ProcessStepIndicatorProps = {
  title: string;
  kicker?: string;
  steps: readonly ProcessStep[];
  className?: string;
};

function toneClass(state: ProcessStepState): string {
  switch (state) {
    case 'completed':
      return 'border-[color-mix(in_srgb,var(--isalwa-success)_28%,var(--isalwa-mist))] bg-[var(--isalwa-tint-green)] text-[var(--isalwa-tint-green-ink)]';
    case 'current':
      return 'border-[color-mix(in_srgb,var(--isalwa-glaze)_35%,var(--isalwa-mist))] bg-[var(--isalwa-teal-100)] text-[var(--isalwa-tint-teal-ink)]';
    case 'attention':
      return 'border-[var(--isalwa-tint-amber-border)] bg-[var(--isalwa-tint-amber)] text-[var(--isalwa-tint-amber-ink)]';
    case 'future':
    default:
      return 'border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-mist)_35%,white)] text-[var(--isalwa-slate)]';
  }
}

function mark(state: ProcessStepState): string {
  if (state === 'completed') return '✓';
  if (state === 'current') return '●';
  if (state === 'attention') return '!';
  return '○';
}

/**
 * Step indicator — completed soft green, current teal, future gray, attention amber.
 * Never shows fake percentages.
 */
export function ProcessStepIndicator({
  title,
  kicker,
  steps,
  className,
}: ProcessStepIndicatorProps) {
  if (steps.length === 0) return null;

  return (
    <section
      className={cx(
        'rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-surface-ops,var(--isalwa-white))] p-4 shadow-[var(--isalwa-shadow-card-resting)]',
        className,
      )}
      aria-label={title}
      data-process-stepper="true"
    >
      {kicker ? <p className="isalwa-kicker">{kicker}</p> : null}
      <h3
        className={cx(
          'font-[family-name:var(--isalwa-font-display)] text-lg italic text-[var(--isalwa-kiln)]',
          kicker ? 'mt-1' : '',
        )}
      >
        {title}
      </h3>
      <ol className="mt-3 flex flex-wrap gap-2" data-process-steps={steps.map((s) => s.id).join(',')}>
        {steps.map((step) => (
          <li
            key={step.id}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-[var(--isalwa-radius-control)] border px-2.5 py-1.5 text-xs font-medium',
              toneClass(step.state),
            )}
            data-step-state={step.state}
          >
            <span aria-hidden>{mark(step.state)}</span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
