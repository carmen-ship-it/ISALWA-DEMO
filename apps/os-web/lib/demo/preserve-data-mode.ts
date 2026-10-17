/**
 * Import path kept only for importers outside lane B. The data-mode switch is
 * retired: no URL value, cookie or header selects a mode, and hrefs pass
 * through unchanged. The integrator removes the call sites and deletes this file.
 */

export type ExplicitDataMode = never;

export function explicitDataMode(_value?: string | null): ExplicitDataMode | null {
  return null;
}

export function hrefWithClientDataMode(href: string): string {
  return href;
}

export function withExplicitDataMode(href: string, _mode?: ExplicitDataMode | null): string {
  return href;
}

export {
  isNavigableAppHref,
  samePathQueryNavigation,
  type SamePathQueryNavigationKind,
} from '@/lib/navigation/same-path-navigation';
