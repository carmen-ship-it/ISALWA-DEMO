export type ListCap = {
  hasMore: true;
  limit: number;
};

export function pushListCap(
  caps: ListCap[] | undefined,
  page: { meta?: { hasMore?: boolean; limit?: number }; items?: readonly unknown[] } | null | undefined,
  fallbackLimit: number,
  shown?: number,
): void {
  if (!caps || !page) return;
  const fetched = page.items?.length ?? 0;
  const truncated = shown != null && fetched > shown;
  if (page.meta?.hasMore !== true && !truncated) return;
  const limit = truncated && shown != null ? shown : (page.meta?.limit ?? fallbackLimit);
  if (caps.some((cap) => cap.limit === limit)) return;
  caps.push({ hasMore: true, limit });
}
