import type { ProjectionFreshness } from '@isalwa/os-contracts';

type StaleProjectionBannerProps = {
  freshness?: ProjectionFreshness | null;
  /** When true, show even without a full freshness object (page-level aggregate). */
  stale?: boolean;
};

export function StaleProjectionBanner({ freshness, stale }: StaleProjectionBannerProps) {
  if (!stale && !freshness?.isStale) return null;

  return (
    <p
      className="mb-6 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-4 py-3 text-sm text-[var(--isalwa-kiln)]"
      role="status"
    >
      Esta información puede estar desactualizada. Actualice en un momento.
    </p>
  );
}
