/**
 * Shell nav selection. Inicio and Excepciones share /inicio but are distinct destinations.
 */

export function navItemIsActive(pathname: string, search: string, itemId: string, href: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const onInicio = pathname === '/inicio';
  const exceptionsView = onInicio && params.get('vista') === 'excepciones';
  if (itemId === 'inicio') return onInicio && !exceptionsView;
  if (itemId === 'excepciones') return exceptionsView;

  const pathOnly = href.split('#')[0]?.split('?')[0] ?? href;
  const query = href.split('#')[0]?.includes('?') ? href.split('#')[0]!.split('?')[1] : '';
  if (query) {
    const normalized = search.startsWith('?') ? search.slice(1) : search;
    return pathname === pathOnly && normalized === query;
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

/** Active section stays open so the current route is never hidden. */
export function navSectionIsOpen(containsActive: boolean, manualCollapsed: boolean): boolean {
  if (containsActive) return true;
  return !manualCollapsed;
}
