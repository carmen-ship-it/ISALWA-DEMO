export type ListQueryState = {
  q?: string;
  status?: string;
  view?: string;
  visibility?: string;
  roleKey?: string;
  cursor?: string;
  panel?: string;
  subjectType?: string;
  subjectId?: string;
  /** Presentation order for the loaded page. Not a store orderBy. */
  sort?: string;
  /** Row spacing preference. */
  density?: string;
  /** Client lens on the loaded page (e.g. approval). Not an authority gate. */
  focus?: string;
  /** 1-based page over an already loaded bounded list. */
  pagina?: string;
  /** JSON array of previous cursors. Empty string means the first page. */
  trail?: string;
};

const LIST_KEYS = [
  'q',
  'status',
  'view',
  'visibility',
  'roleKey',
  'cursor',
  'panel',
  'subjectType',
  'subjectId',
  'sort',
  'density',
  'focus',
  'pagina',
  'trail',
] as const;

export function parseListQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): ListQueryState {
  const read = (key: string): string | undefined => {
    const raw = input instanceof URLSearchParams ? input.get(key) : input[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
  const state: ListQueryState = {};
  for (const key of LIST_KEYS) {
    const value = read(key);
    if (value) state[key] = value;
  }
  return state;
}

export function listSearchParams(state: ListQueryState, omit: Array<keyof ListQueryState> = []): URLSearchParams {
  const search = new URLSearchParams();
  for (const key of LIST_KEYS) {
    if (omit.includes(key)) continue;
    const value = state[key];
    if (value) search.set(key, value);
  }
  return search;
}

export function listHref(path: string, state: ListQueryState, omit: Array<keyof ListQueryState> = []): string {
  const search = listSearchParams(state, omit);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function parseCursorTrail(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

/** Previous/next over a cursor page. Does not invent a total. */
export function cursorPageLinks(
  path: string,
  state: ListQueryState,
  nextCursor: string | null | undefined,
  hasMore: boolean,
): { prevHref: string | null; nextHref: string | null } {
  const trail = parseCursorTrail(state.trail);
  const prevCursor = trail.length > 0 ? trail[trail.length - 1] : null;
  const remaining = trail.slice(0, -1);
  const prevHref =
    prevCursor == null
      ? null
      : listHref(path, {
          ...state,
          cursor: prevCursor || undefined,
          trail: remaining.length > 0 ? JSON.stringify(remaining) : undefined,
        });
  const nextHref =
    hasMore && nextCursor
      ? listHref(path, {
          ...state,
          cursor: nextCursor,
          trail: JSON.stringify([...trail, state.cursor ?? '']),
        })
      : null;
  return { prevHref, nextHref };
}

export function listHrefWithoutCursor(path: string, state: ListQueryState): string {
  return listHref(path, state, ['cursor']);
}

export function panelHref(path: string, state: ListQueryState, panel: string): string {
  return listHref(path, { ...state, panel }, ['cursor']);
}

export function hrefWithoutPanel(path: string, state: ListQueryState): string {
  return listHref(path, state, ['panel']);
}

export function parsePanel(panel: string | undefined): { kind: 'party' | 'quote'; id: string } | null {
  if (!panel) return null;
  const match = /^(party|quote):([A-Za-z0-9_-]{4,64})$/.exec(panel);
  if (!match) return null;
  const kind = match[1];
  const id = match[2];
  if (kind !== 'party' && kind !== 'quote') return null;
  return { kind, id };
}
