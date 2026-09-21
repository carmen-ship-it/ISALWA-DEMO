import { cursorPageLinks, listHref } from '../lists/url-state';

/** Matches GET /issues/:id default journal window. Do not request a larger page from the UI. */
export const ISSUE_JOURNAL_PAGE_SIZE = 25;

const ISSUE_VIEWS = new Set(['assigned', 'reported', 'resolved']);

export type IssueListReturn = {
  view?: string;
  cursor?: string;
  trail?: string;
};

function readParam(
  input: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = input[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseIssueListReturn(
  input: Record<string, string | string[] | undefined>,
): IssueListReturn {
  const view = readParam(input, 'lv');
  return {
    view: view && ISSUE_VIEWS.has(view) ? view : undefined,
    cursor: readParam(input, 'lc'),
    trail: readParam(input, 'lt'),
  };
}

export function parseJournalCursor(
  input: Record<string, string | string[] | undefined>,
): string | undefined {
  const cursor = readParam(input, 'journalCursor');
  return cursor && /^\d+$/.test(cursor) ? cursor : undefined;
}

export function parseJournalTrail(
  input: Record<string, string | string[] | undefined>,
): string | undefined {
  return readParam(input, 'journalTrail');
}

/** Explicit Volver target. Uses the same list URL keys the desk already reads. */
export function issueListReturnHref(list: IssueListReturn): string {
  return listHref('/incidencias', {
    view: list.view,
    cursor: list.cursor,
    trail: list.trail,
  });
}

export function issueDetailHref(issueId: string, list?: IssueListReturn): string {
  const path = `/incidencias/${encodeURIComponent(issueId)}`;
  const params = new URLSearchParams();
  if (list?.view) params.set('lv', list.view);
  if (list?.cursor) params.set('lc', list.cursor);
  if (list?.trail) params.set('lt', list.trail);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function journalRequestQuery(
  journalCursor: string | undefined,
): Record<string, string | number | boolean> {
  return {
    journalLimit: ISSUE_JOURNAL_PAGE_SIZE,
    ...(journalCursor ? { journalCursor } : {}),
  };
}

function remapJournalHref(href: string | null, list: IssueListReturn): string | null {
  if (!href) return null;
  const url = new URL(href, 'http://local');
  const cursor = url.searchParams.get('cursor');
  const trail = url.searchParams.get('trail');
  url.searchParams.delete('cursor');
  url.searchParams.delete('trail');
  if (cursor) url.searchParams.set('journalCursor', cursor);
  if (trail) url.searchParams.set('journalTrail', trail);
  if (list.view) url.searchParams.set('lv', list.view);
  if (list.cursor) url.searchParams.set('lc', list.cursor);
  if (list.trail) url.searchParams.set('lt', list.trail);
  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

/** Anterior/Siguiente over the backend journal cursor. Does not invent a total. */
export function journalPageLinks(input: {
  issueId: string;
  journalCursor?: string;
  journalTrail?: string;
  nextCursor: string | null | undefined;
  hasMore: boolean;
  list: IssueListReturn;
}): { prevHref: string | null; nextHref: string | null } {
  const nav = cursorPageLinks(
    `/incidencias/${encodeURIComponent(input.issueId)}`,
    { cursor: input.journalCursor, trail: input.journalTrail },
    input.nextCursor,
    input.hasMore,
  );
  return {
    prevHref: remapJournalHref(nav.prevHref, input.list),
    nextHref: remapJournalHref(nav.nextHref, input.list),
  };
}

export type JournalSurface = 'events' | 'none' | 'stale';

export function journalSurface(entryCount: number, journalCursor: string | undefined): JournalSurface {
  if (entryCount > 0) return 'events';
  if (journalCursor && journalCursor !== '0') return 'stale';
  return 'none';
}
