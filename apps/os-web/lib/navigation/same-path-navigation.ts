/**
 * Ordinary same-origin app links only.
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
