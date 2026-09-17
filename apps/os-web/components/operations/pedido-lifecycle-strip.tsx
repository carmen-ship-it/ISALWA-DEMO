import { PageSection } from '@isalwa/ui';
import type { PedidoLifecycleStep } from '@/lib/operations/pedido-lifecycle';
import { cx } from '@isalwa/ui';

type PedidoLifecycleStripProps = {
  steps: readonly PedidoLifecycleStep[];
};

/**
 * Cotización → Pedido → Preparación → Nota de Entrega → Salida → Entrega using only recorded facts.
 */
export function PedidoLifecycleStrip({ steps }: PedidoLifecycleStripProps) {
  return (
    <PageSection
      card
      className="bg-white p-5 md:p-6"
      aria-label="Avance del pedido"
    >
      <ol className="flex flex-wrap items-center gap-2 md:gap-3">
        {steps.map((step, index) => {
          const done = step.mark === 'done';
          return (
            <li key={step.id} className="flex items-center gap-2 md:gap-3">
              {index > 0 ? (
                <span aria-hidden className="text-[var(--isalwa-slate)]">
                  →
                </span>
              ) : null}
              <span
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-[var(--isalwa-radius-control)] border px-2.5 py-1 text-xs font-medium',
                  done
                    ? 'border-[color-mix(in_srgb,var(--isalwa-success)_35%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-success)_8%,white)] text-[var(--isalwa-kiln)]'
                    : 'border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_40%,white)] text-[var(--isalwa-slate)]',
                )}
                title={done ? 'Hecho registrado' : 'Sin hecho registrado'}
              >
                <span aria-hidden>{done ? '✓' : '○'}</span>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]">
        Solo hechos registrados. Un paso vacío no inventa preparación, nota de entrega, salida ni entrega.
      </p>
    </PageSection>
  );
}
