import { cx } from '@isalwa/ui';
import type { DeliveryProgressStep } from '@/lib/delivery/delivery-progress';

type DeliveryProgressStripProps = {
  steps: readonly DeliveryProgressStep[];
  className?: string;
};

/** Compact Pedido ✓ · Nota ○ · Salida ○ · Entrega ○ — green confirmed, slate pending. */
export function DeliveryProgressStrip({ steps, className }: DeliveryProgressStripProps) {
  return (
    <ol
      className={cx('flex flex-wrap items-center gap-1.5 text-xs', className)}
      aria-label="Avance de entrega"
    >
      {steps.map((step, index) => {
        const done = step.mark === 'done';
        return (
          <li key={step.id} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden className="text-[var(--isalwa-mist)]">·</span> : null}
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-[var(--isalwa-radius-control)] border px-2 py-1 font-medium',
                done
                  ? 'border-[color-mix(in_srgb,var(--isalwa-success)_28%,var(--isalwa-mist))] bg-[var(--isalwa-tint-green)] text-[var(--isalwa-tint-green-ink)]'
                  : 'border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-mist)_35%,white)] text-[var(--isalwa-slate)]',
              )}
            >
              <span aria-hidden>{done ? '✓' : '○'}</span>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
