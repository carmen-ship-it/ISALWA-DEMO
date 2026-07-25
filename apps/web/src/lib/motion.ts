/**
 * ISALWA Motion System — JS companion to the CSS token layer.
 *
 * These constants mirror the CSS custom properties in tokens.css exactly.
 * Always use these instead of hardcoded millisecond values in JS animations.
 *
 * CSS-based transitions (className / style transition property) already
 * respect prefers-reduced-motion via the token collapse in tokens.css.
 * JS animations must use reducedMotion() + dur() to participate in the system.
 */

// ── Duration constants (ms) ────────────────────────────────────────────────

/** Mirrors --isalwa-motion-* tokens. Use dur() to get 0 on reduced-motion. */
export const DURATION = {
  instant:    40,   // Micro feedback
  fast:       140,  // Hover feedback, chip toggles, icon swaps
  base:       220,  // Panel reveals, message entrance, standard enter
  normal:     220,  // Alias of base
  slow:       360,  // Overlay fades, whisper tooltips, success flash
  deliberate: 520,  // Page-level enters, bar fills, map pin entry
} as const;

/** Distance / opacity / scale — mirror CSS motion tokens (Mission 14). */
export const MOTION = {
  distanceEnter: 8,
  distanceWhisper: 6,
  opacityMuted: 0.45,
  scalePress: 0.98,
  staggerStep: 40,
} as const;

// ── Easing strings ─────────────────────────────────────────────────────────

/** Mirrors --isalwa-ease-* tokens. */
export const EASING = {
  out:    'cubic-bezier(0.16, 1, 0.3, 1)',   // Standard — fast out, gentle settle
  inOut:  'cubic-bezier(0.45, 0, 0.15, 1)',  // Skeletons, continuous loops
  spring: 'cubic-bezier(0.22, 1.2, 0.36, 1)', // Map pins, scale entries
} as const;

// ── Reduced-motion guard ───────────────────────────────────────────────────

/**
 * Returns true when the user prefers reduced motion. SSR-safe.
 * Call this before every JS-driven animation.
 */
export function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns the duration in ms for a given token key.
 * Collapses to 0 when the user prefers reduced motion.
 */
export function dur(key: keyof typeof DURATION): number {
  return reducedMotion() ? 0 : DURATION[key];
}

// ── Stagger ────────────────────────────────────────────────────────────────

/**
 * Returns the stagger delay in ms for the nth item (40ms per step, max 12).
 * Collapses to 0 on reduced-motion.
 *
 * @param index  Item index (0-based)
 * @param offset Additional base delay in ms
 */
export function stagger(index: number, offset = 0): number {
  if (reducedMotion()) return 0;
  return offset + Math.min(index, 12) * MOTION.staggerStep;
}

// ── Inline transition builder ──────────────────────────────────────────────

/**
 * Builds an inline CSS transition string using system tokens.
 * Returns 'none' on reduced-motion so JS-controlled transitions respect the
 * preference even when set via style props (not className).
 *
 * @example
 * style={{ transition: t(['transform', 'box-shadow']) }}
 * style={{ transition: t(['background-color'], 'base') }}
 */
export function t(
  props: string[],
  duration: keyof typeof DURATION = 'fast',
  easing:   keyof typeof EASING   = 'out',
): string {
  if (reducedMotion()) return 'none';
  const d = `${DURATION[duration]}ms`;
  const e = EASING[easing];
  return props.map((p) => `${p} ${d} ${e}`).join(', ');
}

/**
 * Inline transition string for the standard interactive hover/press.
 * Drop-in replacement for hardcoded '120ms ease-out', '140ms ease-out', etc.
 *
 * @example
 * style={{ transition: tFast('background-color', 'border-color') }}
 */
export function tFast(...props: string[]): string {
  return t(props, 'fast', 'out');
}

/**
 * Inline transition string for layout-level changes (panel reveals, totals).
 *
 * @example
 * style={{ transition: tBase('opacity', 'color') }}
 */
export function tBase(...props: string[]): string {
  return t(props, 'base', 'out');
}
