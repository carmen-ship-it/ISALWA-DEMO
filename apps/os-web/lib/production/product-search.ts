export type CatalogProductId = {
  productId: string;
  name?: string | null;
};

export type ProductIdSearch =
  | { namesAvailable: false; hits: [] }
  | { namesAvailable: true; hits: Array<{ productId: string; name: string | null }> };

/**
 * Search product ids. An empty catalog does not invent names.
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
    .filter((item) => item.productId.trim().toLowerCase().includes(query))
    .map((item) => ({
      productId: item.productId.trim(),
      name: item.name?.trim() ? item.name.trim() : null,
    }));
  return { namesAvailable: true, hits };
}
