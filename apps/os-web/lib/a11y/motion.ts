/**
 * Respect prefers-reduced-motion without inventing a second motion system.
 * Tokens already collapse durations in @isalwa/ui; this is for JS-driven motion only.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Use for optional enter animations; returns 0 when the user asks for reduced motion. */
export function motionMs(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 0;
  return prefersReducedMotion() ? 0 : durationMs;
}
