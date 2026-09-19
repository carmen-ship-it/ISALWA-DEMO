import { listHref, type ListQueryState } from '@/lib/lists/url-state';

export const LIST_PAGE_SIZE = 25;

export function parsePageNumber(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return 1;
  return value;
}

export function sliceListPage<T>(items: readonly T[], page: number, size = LIST_PAGE_SIZE) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * size;
  const window = items.slice(start, start + size);
  return {
    items: window,
    page: safePage,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + window.length,
    total,
    showChrome: total > size,
  };
}

export function boundedPageHrefs(path: string, state: ListQueryState, page: number, pageCount: number) {
  const base: ListQueryState = { ...state, cursor: undefined, pagina: undefined };
  return {
    prevHref:
      page > 1
        ? listHref(path, { ...base, pagina: page - 1 <= 1 ? undefined : String(page - 1) })
        : null,
    nextHref: page < pageCount ? listHref(path, { ...base, pagina: String(page + 1) }) : null,
  };
}
