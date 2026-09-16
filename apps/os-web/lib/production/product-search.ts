export type CatalogProductId = {
  productId: string;
  name?: string | null;
};

export type ProductIdSearch =
  | { namesAvailable: false; hits: [] }
  | { namesAvailable: true; hits: Array<{ productId: string; name: string | null }> };

/**
 * Search catalog products by name (primary) or product id (secondary).
 * An empty catalog does not invent names and does not accept free-typed opaque ids.
 * A missing name stays null; it is not generated from the id.
 */
export function searchProductIds(
  catalog: readonly CatalogProductId[] | null | undefined,
  text: string,
): ProductIdSearch {
  if (!catalog || catalog.length === 0) {
    return { namesAvailable: false, hits: [] };
  }
  const query = text.trim().toLowerCase();
  if (query.length < 1) {
    return { namesAvailable: true, hits: [] };
  }
  const hits = catalog
    .filter((item) => {
      const id = item.productId.trim().toLowerCase();
      const name = item.name?.trim().toLowerCase() ?? '';
      return id.includes(query) || name.includes(query);
    })
    .map((item) => ({
      productId: item.productId.trim(),
      name: item.name?.trim() ? item.name.trim() : null,
    }));
  return { namesAvailable: true, hits };
}

/** True only when productId is present in the authorized catalog list. */
export function catalogContainsProductId(
  catalog: readonly CatalogProductId[] | null | undefined,
  productId: string,
): boolean {
  const needle = productId.trim();
  if (!needle || !catalog || catalog.length === 0) return false;
  return catalog.some((item) => item.productId.trim() === needle);
}

export function catalogProductLabel(
  catalog: readonly CatalogProductId[] | null | undefined,
  productId: string,
): string | null {
  const needle = productId.trim();
  if (!needle || !catalog) return null;
  const hit = catalog.find((item) => item.productId.trim() === needle);
  if (!hit) return null;
  return hit.name?.trim() || null;
}
