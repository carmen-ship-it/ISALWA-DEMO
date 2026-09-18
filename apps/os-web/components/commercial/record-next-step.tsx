import Link from 'next/link';
import { Button, cx } from '@isalwa/ui';
import {
  COMMERCIAL_NEXT_STEP_LABEL,
  type CommercialNextStep,
} from '@/lib/commercial/next-step';

type RecordNextStepProps = {
  step: CommercialNextStep | null;
  className?: string;
};

/** Compact next-step band for opportunity / quote / pedido — sky context surface. */
export function RecordNextStep({ step, className }: RecordNextStepProps) {
  if (!step) return null;

  return (
    <div
      className={cx(
        'mb-6 rounded-[var(--isalwa-radius-panel)] border border-[color-mix(in_srgb,var(--isalwa-sky-200)_80%,var(--isalwa-mist))] bg-[var(--isalwa-surface-context)] px-4 py-3 shadow-[var(--isalwa-shadow-soft)]',
        className,
      )}
      role="status"
    >
      <p className="isalwa-section-label">{COMMERCIAL_NEXT_STEP_LABEL}</p>
      <p className="mt-1 font-[family-name:var(--isalwa-font-display)] text-base italic text-[var(--isalwa-kiln)]">
        {step.statement}
      </p>
      {step.href && step.hrefLabel ? (
        <p className="mt-3">
          <Link href={step.href}>
            <Button type="button">{step.hrefLabel}</Button>
          </Link>
        </p>
      ) : null}
    </div>
  );
}
