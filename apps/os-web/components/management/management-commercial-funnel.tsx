import type { CommercialFunnelStep } from '@/lib/management/commercial-funnel';

type ManagementCommercialFunnelProps = {
  steps: readonly CommercialFunnelStep[];
  periodLabel: string;
};

/**
 * Count funnel Oportunidades → Cotizaciones → Pedidos.
 * Never implies monetary revenue.
 */
export function ManagementCommercialFunnel({ steps, periodLabel }: ManagementCommercialFunnelProps) {
  if (steps.every((step) => step.count === 0)) return null;

  return (
    <section
      aria-label="Embudo comercial"
      className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-tint-teal-border)] bg-[color-mix(in_srgb,var(--isalwa-teal-100)_70%,white)] p-4 shadow-[var(--isalwa-shadow-soft)] md:p-5"
      data-management-funnel="counts"
    >
      <p className="isalwa-kicker">Embudo comercial</p>
      <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
        Oportunidades → Cotizaciones → Pedidos
      </h2>
      <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
        Conteos del período ({periodLabel}). No es embudo de ingresos.
      </p>
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-0 flex-1 items-stretch gap-2 sm:gap-3">
            <div
              className="flex min-w-0 flex-1 flex-col justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 py-3"
              title={step.definition}
            >
              <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                {step.label}
              </p>
              <p className="isalwa-metric mt-1 text-[clamp(22px,2vw,28px)] text-[var(--isalwa-kiln)]">
                {step.count}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="hidden shrink-0 self-center text-lg text-[var(--isalwa-glaze)] sm:inline"
              >
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
