import Link from 'next/link';
import {
  COMMERCIAL_NEXT_STEP_LABEL,
  type CommercialNextStep,
} from '@/lib/commercial/next-step';

const linkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

type RecordNextStepProps = {
  step: CommercialNextStep | null;
  className?: string;
};

/** Compact strip for opportunity / quote / pedido detail. Renders nothing when there is no derived step. */
export function RecordNextStep({ step, className }: RecordNextStepProps) {
  if (!step) return null;

  return (
    <div
      className={
        className ??
        'mb-8 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 py-3'
      }
      role="status"
    >
      <p className="isalwa-section-label">{COMMERCIAL_NEXT_STEP_LABEL}</p>
      <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">{step.statement}</p>
      {step.href && step.hrefLabel ? (
        <p className="mt-2">
          <Link href={step.href} className={linkClass}>
            {step.hrefLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
