export type ExplicitDataMode = 'demo' | 'real';

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

/**
 * Only ordinary same-origin app links should carry ?datos=.
 * Blob and data URLs are file actions. API PDF routes already carry the file.
 * Treating a blob URL as a route pushes a UUID path and shows a missing page.
 */
export function isNavigableAppHref(raw: string, origin: string): boolean {
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return false;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.origin !== origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  return true;
}

export type SamePathQueryNavigationKind = 'push' | 'assign' | 'none';

const NAV_BASE = 'http://local.invalid';

function isAbsoluteHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function parseNavHref(href: string, base: string): URL | null {
  try {
    return new URL(href, base);
  } catch {
    return null;
  }
}

/**
 * Same-path search/hash changes do not land via App Router push/replace
 * after history.replaceState. Those must use location.assign.
 * A different pathname stays a normal push.
 */
export function samePathQueryNavigation(
  currentHref: string,
  nextHref: string,
): { kind: SamePathQueryNavigationKind; href: string } {
  const currentBase = isAbsoluteHref(currentHref) ? currentHref : NAV_BASE;
  const current = parseNavHref(currentHref, NAV_BASE);
  const next = parseNavHref(nextHref, currentBase);
  if (!current || !next) return { kind: 'push', href: nextHref };
  const href = `${next.pathname}${next.search}${next.hash}`;
  const bothAbsolute = isAbsoluteHref(currentHref) && isAbsoluteHref(nextHref);
  if ((bothAbsolute && current.origin !== next.origin) || current.pathname !== next.pathname) {
    return { kind: 'push', href };
  }
  if (current.search !== next.search || current.hash !== next.hash) {
    return { kind: 'assign', href };
  }
  return { kind: 'none', href };
}
