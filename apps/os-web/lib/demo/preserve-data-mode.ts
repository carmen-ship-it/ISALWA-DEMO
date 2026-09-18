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
