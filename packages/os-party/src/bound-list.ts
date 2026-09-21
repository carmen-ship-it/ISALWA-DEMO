/** Cursor-bounded party child lists — Cliente 360 locations/contacts. */

export const PARTY_LIST_DEFAULT_LIMIT = 25;

export type PartyBoundListOptions = {
  limit: number;
  cursor?: string;
};

export type PartyBoundListPage<T> = {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type BoundListCursor = {
  createdAt: string;
  id: string;
  status?: string;
};

export function encodeBoundListCursor(cursor: BoundListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeBoundListCursor(raw: string | undefined): BoundListCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), 'base64url').toString('utf8')) as BoundListCursor;
    if (!parsed?.createdAt || !parsed?.id) return null;
    const at = new Date(parsed.createdAt);
    if (Number.isNaN(at.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

type LocationLike = { id: string; status: string; createdAt: Date };
type CreatedDescLike = { id: string; createdAt: Date };

function locationRank(status: string): number {
  return status === 'active' ? 0 : 1;
}

export function compareLocationsActiveThenCreatedDesc(a: LocationLike, b: LocationLike): number {
  const statusCmp = locationRank(a.status) - locationRank(b.status);
  if (statusCmp !== 0) return statusCmp;
  const timeCmp = b.createdAt.getTime() - a.createdAt.getTime();
  if (timeCmp !== 0) return timeCmp;
  if (a.id === b.id) return 0;
  return a.id > b.id ? -1 : 1;
}

export function compareCreatedAtDesc(a: CreatedDescLike, b: CreatedDescLike): number {
  const timeCmp = b.createdAt.getTime() - a.createdAt.getTime();
  if (timeCmp !== 0) return timeCmp;
  if (a.id === b.id) return 0;
  return a.id > b.id ? -1 : 1;
}

function slicePage<T extends { id: string; createdAt: Date; status?: string }>(
  ordered: T[],
  options: PartyBoundListOptions,
  withStatus: boolean,
): PartyBoundListPage<T> {
  const limit = options.limit;
  const hasMore = ordered.length > limit;
  const items = hasMore ? ordered.slice(0, limit) : ordered;
  const last = items[items.length - 1];
  return {
    items,
    hasMore,
    nextCursor:
      hasMore && last
        ? encodeBoundListCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
            ...(withStatus ? { status: String(last.status ?? '') } : {}),
          })
        : null,
  };
}

export function pageLocationsActiveThenCreatedDesc<T extends LocationLike>(
  rows: readonly T[],
  options: PartyBoundListOptions,
): PartyBoundListPage<T> {
  const sorted = [...rows].sort(compareLocationsActiveThenCreatedDesc);
  const cursor = decodeBoundListCursor(options.cursor);
  const cursorRow = cursor
    ? {
        id: cursor.id,
        status: cursor.status ?? 'inactive',
        createdAt: new Date(cursor.createdAt),
      }
    : null;
  const ordered = cursorRow
    ? sorted.filter((row) => compareLocationsActiveThenCreatedDesc(row, cursorRow) > 0)
    : sorted;
  return slicePage(ordered, options, true);
}

export function pageCreatedAtDesc<T extends CreatedDescLike>(
  rows: readonly T[],
  options: PartyBoundListOptions,
): PartyBoundListPage<T> {
  const sorted = [...rows].sort(compareCreatedAtDesc);
  const cursor = decodeBoundListCursor(options.cursor);
  const cursorRow = cursor ? { id: cursor.id, createdAt: new Date(cursor.createdAt) } : null;
  const ordered = cursorRow
    ? sorted.filter((row) => compareCreatedAtDesc(row, cursorRow) > 0)
    : sorted;
  return slicePage(ordered, options, false);
}

export function locationCursorWhere(cursor: BoundListCursor | null): Record<string, unknown> {
  if (!cursor?.status) return {};
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) return {};
  return {
    OR: [
      { status: { gt: cursor.status } },
      { AND: [{ status: cursor.status }, { createdAt: { lt: createdAt } }] },
      { AND: [{ status: cursor.status }, { createdAt }, { id: { lt: cursor.id } }] },
    ],
  };
}

export function createdAtDescCursorWhere(cursor: BoundListCursor | null): Record<string, unknown> {
  if (!cursor) return {};
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) return {};
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { AND: [{ createdAt }, { id: { lt: cursor.id } }] },
    ],
  };
}
