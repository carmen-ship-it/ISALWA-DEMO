import { readReviewedPreviewJson } from '@/lib/catalog/reviewed-preview';
import type { CatalogProductId } from '@/lib/production/product-search';

type PreviewFile = {
  products?: Array<{ id?: string; name?: string; active?: boolean }>;
};

/**
 * Load Product Master preview candidates for plant annotation.
 * No list-products API yet — reuse the same reviewed preview Productos reads.
 * Fail closed: null when the file is missing (UI must not accept typed opaque ids).
 */
export function loadProductionCatalog(): readonly CatalogProductId[] | null {
  const preview = readReviewedPreviewJson() as PreviewFile | null;
  if (!preview) return null;
  const products = (preview.products ?? [])
    .filter((product) => product.active !== false && Boolean(product.id?.trim()))
    .map((product) => ({
      productId: product.id!.trim(),
      name: product.name?.trim() || null,
    }));
  return products.length > 0 ? products : null;
}
