/**
 * Operating widths for os-web polish: phone → laptop.
 * Prefer these named bands over inventing one-off media queries in shared chrome.
 */

export const VIEWPORT_MIN_PX = 390;
export const VIEWPORT_MAX_PX = 1440;

export const BREAKPOINTS = {
  /** Small phone floor used in polish QA. */
  phone: VIEWPORT_MIN_PX,
  /** Compact tablets / large phones. */
  tablet: 768,
  /** Laptop operating desk. */
  laptop: 1024,
  /** Wide desk ceiling for content shells. */
  wide: VIEWPORT_MAX_PX,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

export function isWithinOperatingWidth(widthPx: number): boolean {
  if (!Number.isFinite(widthPx)) return false;
  return widthPx >= VIEWPORT_MIN_PX && widthPx <= VIEWPORT_MAX_PX;
}
