import type { ProjectionFreshness } from '@isalwa/os-contracts';

/**
 * Projection freshness may be null when no consumer checkpoint exists yet
 * (`OsProjectionStorePort.getFreshness` → `ProjectionFreshness | null`).
 * Null means "no freshness metadata" — not stale.
 */
export function isProjectionStale(
  freshness: ProjectionFreshness | null | undefined,
): boolean {
  return freshness?.isStale === true;
}
