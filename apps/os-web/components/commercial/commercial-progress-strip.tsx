import type { CommercialProgressStep } from '@/lib/commercial/commercial-progress';

type CommercialProgressStripProps = {
  steps: CommercialProgressStep[];
  /** Optional process kicker above the strip. */
  kicker?: string;
};

const stateClass: Record<CommercialProgressStep['state'], string> = {
  complete: 'text-[var(--isalwa-success,#2f6b4f)]',
  current: 'font-medium text-[var(--isalwa-glaze)]',
  upcoming: 'text-[var(--isalwa-slate)]',
};

const markFor = (state: CommercialProgressStep['state']): string => {
  if (state === 'complete') return '✓';
  if (state === 'current') return '●';
  return '○';
};

/** Cliente → Oportunidad → Cotización progress. No opaque IDs. */
export function CommercialProgressStrip({
  steps,
  kicker = 'Proceso comercial',
}: CommercialProgressStripProps) {
  if (steps.length === 0) return null;

  return (
    <div className="mb-6" data-commercial-progress="strip">
      <p className="isalwa-section-label">{kicker}</p>
      <ol className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-3">
            {index > 0 ? (
              <span aria-hidden="true" className="text-[var(--isalwa-mist-strong,#c9d2d6)]">
                →
              </span>
            ) : null}
            <span className={`inline-flex items-center gap-1.5 ${stateClass[step.state]}`}>
              <span aria-hidden="true">{markFor(step.state)}</span>
              <span>{step.label}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
