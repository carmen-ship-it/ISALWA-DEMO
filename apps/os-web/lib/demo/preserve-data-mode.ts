import { DEMO_DATA_MODE_COOKIE } from './owner-demo-identity';

export type ExplicitDataMode = 'demo' | 'real';

/** Set by middleware when the URL carries explicit datos. Read on the same request. */
export const DATA_MODE_REQUEST_HEADER = 'x-isalwa-data-mode';

/** Only an explicit query value. Absence is not demo and not real. */
export function explicitDataMode(value: string | null | undefined): ExplicitDataMode | null {
  const mode = value?.trim().toLowerCase();
  if (mode === 'demo' || mode === 'real') return mode;
  return null;
}

/**
 * Keep the current explicit data mode on a same-app href.
 * Does not invent demo when the current page has no datos param.
 */
export function dataModeForRedirect(input: {
  formDatos?: string | null;
  refererDatos?: string | null;
  cookieDatos?: string | null;
}): ExplicitDataMode | null {
  return (
    explicitDataMode(input.formDatos) ??
    explicitDataMode(input.refererDatos) ??
    explicitDataMode(input.cookieDatos)
  );
}

/** Browser-only. URL wins over the mode cookie. Absence stays absent — never inferred from a name. */
export function clientDataMode(): ExplicitDataMode | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = explicitDataMode(new URLSearchParams(window.location.search).get('datos'));
  if (fromUrl) return fromUrl;
  const row = document.cookie.split('; ').find((part) => part.startsWith(`${DEMO_DATA_MODE_COOKIE}=`));
  return explicitDataMode(row ? decodeURIComponent(row.slice(DEMO_DATA_MODE_COOKIE.length + 1)) : null);
}

export function hrefWithClientDataMode(href: string): string {
  return withExplicitDataMode(href, clientDataMode());
}

export function withExplicitDataMode(href: string, mode: ExplicitDataMode | null | undefined): string {
  if (!mode) return href;
  const hashAt = href.indexOf('#');
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  const withoutHash = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const queryAt = withoutHash.indexOf('?');
  const path = queryAt >= 0 ? withoutHash.slice(0, queryAt) : withoutHash;
  const params = new URLSearchParams(queryAt >= 0 ? withoutHash.slice(queryAt + 1) : '');
  if (params.get('datos') === mode) return href;
  params.set('datos', mode);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
}

export {
  isNavigableAppHref,
  samePathQueryNavigation,
  type SamePathQueryNavigationKind,
} from '@/lib/navigation/same-path-navigation';
