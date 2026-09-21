import {
  LIST_PAGE_SIZE,
  boundedPageHrefs,
  parsePageNumber,
  sliceListPage,
} from '@/lib/lists/page-window';
import { listHref, parseListQuery, type ListQueryState } from '@/lib/lists/url-state';

export { LIST_PAGE_SIZE, parsePageNumber, sliceListPage, boundedPageHrefs, parseListQuery, listHref };
export type { ListQueryState };

/** Extra query keys ops desks keep outside frozen ListQueryState (e.g. selected Pedido). */
export type OpsExtraParams = {
  orderId?: string | null;
  datos?: string | null;
};

export function appendOpsExtras(href: string, extras: OpsExtraParams = {}): string {
  const params = new URLSearchParams();
  const orderId = extras.orderId?.trim();
  const datos = extras.datos?.trim();
  if (orderId) params.set('orderId', orderId);
  if (datos) params.set('datos', datos);
  const extra = params.toString();
  if (!extra) return href;
  return href.includes('?') ? `${href}&${extra}` : `${href}?${extra}`;
}

export function opsBoundedPageHrefs(
  path: string,
  state: ListQueryState,
  page: number,
  pageCount: number,
  extras: OpsExtraParams = {},
) {
  const links = boundedPageHrefs(path, state, page, pageCount);
  return {
    prevHref: links.prevHref ? appendOpsExtras(links.prevHref, extras) : null,
    nextHref: links.nextHref ? appendOpsExtras(links.nextHref, extras) : null,
  };
}

export function opsListHref(path: string, state: ListQueryState, extras: OpsExtraParams = {}): string {
  return appendOpsExtras(listHref(path, state), extras);
}

export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('es');
}

export function matchesOpsSearch(
  query: string | undefined,
  fields: ReadonlyArray<string | null | undefined>,
): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  return fields.some((field) => normalizeSearchText(field).includes(needle));
}

export type OpsCollectionWindow<T> = ReturnType<typeof sliceListPage<T>> & {
  matchedTotal: number;
  hasQuery: boolean;
  zeroMatch: boolean;
  trueEmpty: boolean;
};

export function windowOpsCollection<T>(
  items: readonly T[],
  pageRaw: string | undefined,
  size = LIST_PAGE_SIZE,
): OpsCollectionWindow<T> {
  const page = parsePageNumber(pageRaw);
  const window = sliceListPage(items, page, size);
  const hasQuery = false;
  return {
    ...window,
    matchedTotal: window.total,
    hasQuery,
    zeroMatch: false,
    trueEmpty: window.total === 0,
  };
}

export function windowFilteredOpsCollection<T>(
  items: readonly T[],
  opts: {
    q?: string;
    pagina?: string;
    size?: number;
    match: (item: T, q: string | undefined) => boolean;
  },
): OpsCollectionWindow<T> {
  const hasQuery = Boolean(opts.q?.trim());
  const matched = items.filter((item) => opts.match(item, opts.q));
  const window = sliceListPage(matched, parsePageNumber(opts.pagina), opts.size ?? LIST_PAGE_SIZE);
  return {
    ...window,
    matchedTotal: matched.length,
    hasQuery,
    zeroMatch: hasQuery && matched.length === 0,
    trueEmpty: !hasQuery && items.length === 0,
  };
}

/** Bound nested histories / picker option pools without inventing totals. */
export function boundHistoryItems<T>(items: readonly T[], limit = LIST_PAGE_SIZE): {
  items: T[];
  truncated: boolean;
  shown: number;
  loaded: number;
} {
  const loaded = items.length;
  const shown = Math.min(loaded, limit);
  return {
    items: items.slice(0, limit),
    truncated: loaded > limit,
    shown,
    loaded,
  };
}
