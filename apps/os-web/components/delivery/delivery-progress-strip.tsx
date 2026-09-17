import { cx } from '@isalwa/ui';
import type { DeliveryProgressStep } from '@/lib/delivery/delivery-progress';

type DeliveryProgressStripProps = {
  steps: readonly DeliveryProgressStep[];
  className?: string;
};

/** Compact Pedido ✓ · Nota ○ · Salida ○ · Entrega ○ indicator. */
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
            {index > 0 ? <span aria-hidden className="text-[var(--isalwa-slate)]">·</span> : null}
            <span
              className={cx(
                'inline-flex items-center gap-1 font-medium',
                done ? 'text-[var(--isalwa-kiln)]' : 'text-[var(--isalwa-slate)]',
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
