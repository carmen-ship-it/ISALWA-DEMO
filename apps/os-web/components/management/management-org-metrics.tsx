import Link from 'next/link';
import { MetricCard } from '@isalwa/ui';
import type { OrgMetricCard } from '@/lib/management/org-metrics';
import type { ManagementPeriodPreset } from '@/lib/management/org-metrics';
import { ManagementExamplePreviewTrigger } from '@/components/management/management-example-preview';

type ManagementOrgMetricsProps = {
  cards: OrgMetricCard[];
  period: ManagementPeriodPreset;
  showExampleAffordance: boolean;
  sparseLiveData: boolean;
};

function periodHref(preset: ManagementPeriodPreset): string {
  return `/inicio?lente=empresa&periodo=${preset}`;
}

export function ManagementOrgMetrics({
  cards,
  period,
  showExampleAffordance,
  sparseLiveData,
}: ManagementOrgMetricsProps) {
  return (
    <section aria-label="Métricas de empresa" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="isalwa-kicker">Empresa</p>
          <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
            Lectura operativa
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['7', '30', '90'] as const).map((preset) => (
            <Link
              key={preset}
              href={periodHref(preset)}
              className={
                period === preset
                  ? 'rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-kiln)] px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase'
                  : 'rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--isalwa-slate)] uppercase'
              }
            >
              {preset} días
            </Link>
          ))}
          {showExampleAffordance && sparseLiveData ? (
            <ManagementExamplePreviewTrigger kind="org-metrics" />
          ) : null}
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const value = card.secondary ?? card.count ?? '—';
          const body = (
            <MetricCard
              interactive={Boolean(card.href)}
              label={card.label}
              value={value}
              hint={card.tooltip}
              className="h-full"
            />
          );
          return card.href ? (
            <Link key={card.id} href={card.href} className="min-w-0">
              {body}
            </Link>
          ) : (
            <div key={card.id} className="min-w-0">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
