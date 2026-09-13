import type { ProjectionFreshness } from '@isalwa/os-contracts';

type StaleProjectionBannerProps = {
  freshness?: ProjectionFreshness | null;
  /** When true, show even without a full freshness object (page-level aggregate). */
  stale?: boolean;
};

export function StaleProjectionBanner({ freshness, stale }: StaleProjectionBannerProps) {
  if (!stale && !freshness?.isStale) return null;

  return (
    <div
      className="mb-6 rounded-[var(--isalwa-radius-panel)] border border-[color-mix(in_srgb,var(--isalwa-warning)_30%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-warning)_8%,white)] px-4 py-3 text-sm text-[var(--isalwa-slate)]"
      role="status"
    >
      <p className="font-medium text-[var(--isalwa-kiln)]">Información en actualización</p>
      <p className="mt-1 leading-relaxed">
        Algunos datos pueden tardar unos momentos en reflejar cambios recientes. Si acaba de
        registrar algo, espere e intente de nuevo.
      </p>
    </div>
  );
}
