/**
 * Shared focus-ring class for interactive chrome that is not already a @isalwa/ui Button.
 * Matches Button / OperatingRow focus-visible treatment.
 */
export const FOCUS_RING_CLASS =
  'outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/** Combine with interactive controls that need a keyboard focus cue. */
export function withFocusRing(...classes: Array<string | false | null | undefined>): string {
  return ['isalwa-focus-ring', FOCUS_RING_CLASS, ...classes.filter(Boolean)].join(' ');
}
