/**
 * Operating widths for os-web polish: phone → laptop.
 * Prefer these named bands over inventing one-off media queries in shared chrome.
 *
 * Shell header offsets (measured hosted 16f8242) live in styles/visual-mobile.css as
 * `--isalwa-shell-header-offset`. Keep these constants in sync when chrome padding changes.
 */

export const VIEWPORT_MIN_PX = 390;
export const VIEWPORT_MAX_PX = 1440;

/** Sticky strips under the shell header — phone/tablet measured height. */
export const SHELL_HEADER_OFFSET_PX = 65;
/** Sticky strips under the shell header — laptop+ (lg:py-4) measured height. */
export const SHELL_HEADER_OFFSET_LG_PX = 77;

export const BREAKPOINTS = {
  /** Small phone floor used in polish QA. */
  phone: VIEWPORT_MIN_PX,
  /** Compact tablets / large phones. */
  tablet: 768,
  /** Laptop operating desk (lg rail appears). */
  laptop: 1024,
  /** Compact laptop / 125% zoom common desk. */
  laptopCompact: 1280,
  /** Wide desk ceiling for content shells. */
  wide: VIEWPORT_MAX_PX,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

export function isWithinOperatingWidth(widthPx: number): boolean {
  if (!Number.isFinite(widthPx)) return false;
  return widthPx >= VIEWPORT_MIN_PX && widthPx <= VIEWPORT_MAX_PX;
}

/** Sticky `top` under the shell header for the given viewport width. */
export function shellHeaderOffsetPx(widthPx: number): number {
  if (!Number.isFinite(widthPx)) return SHELL_HEADER_OFFSET_PX;
  return widthPx >= BREAKPOINTS.laptop ? SHELL_HEADER_OFFSET_LG_PX : SHELL_HEADER_OFFSET_PX;
}
