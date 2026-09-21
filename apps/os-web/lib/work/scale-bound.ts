/**
 * Task 11B — pure bound helpers mirroring Work/Control desk pagination.
 * Keep in sync with API defaults (limit 25, offset cursor).
 */

export const WORK_CONTROL_PAGE_SIZE = 25;
export const NOTIFICATION_SHELL_CAP = 8;
export const DATA_HEALTH_PARTY_SAMPLE = 25;

export function offsetPage<T>(
  items: readonly T[],
  cursor: string | null | undefined,
  limit = WORK_CONTROL_PAGE_SIZE,
): {
  page: T[];
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
} {
  const size = Math.min(Math.max(limit, 1), 100);
  let offset = 0;
  if (cursor && /^\d+$/.test(cursor)) offset = parseInt(cursor, 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  const page = items.slice(offset, offset + size);
  const hasMore = offset + page.length < items.length;
  return {
    page,
    hasMore,
    nextCursor: hasMore ? String(offset + page.length) : null,
    limit: size,
  };
}

export function boundNewestFirst<T>(
  items: readonly T[],
  getTime: (item: T) => number,
  cursor?: string | null,
  limit = WORK_CONTROL_PAGE_SIZE,
) {
  const sorted = [...items].sort((a, b) => getTime(b) - getTime(a));
  return offsetPage(sorted, cursor, limit);
}

export function shellNotificationSample<T>(items: readonly T[], cap = NOTIFICATION_SHELL_CAP): T[] {
  return items.slice(0, cap);
}
