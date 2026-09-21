import { StatGroup, StatusPill } from '@isalwa/ui';
import type { MapCoverageHonesty } from '@/lib/map/build-view-model';
import type { MapProviderStatus } from '@/lib/map/provider-status';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type MapCoverageBannerProps = {
  coverage: MapCoverageHonesty;
  provider: MapProviderStatus;
  partial: boolean;
};

export function MapCoverageBanner({ coverage, provider, partial }: MapCoverageBannerProps) {
  return (
    <section
      className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)] p-4 shadow-[var(--isalwa-shadow-resting)] md:p-5"
      data-tour={TOUR_TARGET.mapCoverage}
      aria-label="Cobertura de ubicación"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="manual">{provider.label}</StatusPill>
        {coverage.honesty ? (
          <p className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)] md:text-2xl">
            {coverage.honesty}
          </p>
        ) : null}
      </div>

      <StatGroup
        className="mt-4"
        items={[
          {
            label: 'Con ubicación',
            value: coverage.withCoordinates,
            tone: 'var(--isalwa-glaze)',
          },
          {
            label: 'Sin ubicación confirmada',
            value: coverage.provenanceOnly,
            tone: 'var(--isalwa-kiln)',
          },
          {
            label: 'Clientes revisados',
            value: coverage.total,
          },
        ]}
      />

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Mostramos únicamente clientes con una ubicación confirmada.
        {partial ? ' Esta lectura no incluye todos los clientes.' : null}
      </p>
    </section>
  );
}
