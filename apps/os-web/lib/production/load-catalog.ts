import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CatalogProductId } from '@/lib/production/product-search';

const PREVIEW_CANDIDATES = [
  join(process.cwd(), 'packages/os-catalog/preview/vitri-2026-reviewed.json'),
  join(process.cwd(), '../../packages/os-catalog/preview/vitri-2026-reviewed.json'),
];

type PreviewFile = {
  products?: Array<{ id?: string; name?: string; active?: boolean }>;
};

/**
 * Load Product Master preview candidates for plant annotation.
 * No list-products API yet — reuse the same reviewed preview Productos reads.
 * Fail closed: null when the file is missing (UI must not accept typed opaque ids).
 */
export function loadProductionCatalog(): readonly CatalogProductId[] | null {
  for (const path of PREVIEW_CANDIDATES) {
    try {
      const preview = JSON.parse(readFileSync(path, 'utf8')) as PreviewFile;
      const products = (preview.products ?? [])
        .filter((product) => product.active !== false && Boolean(product.id?.trim()))
        .map((product) => ({
          productId: product.id!.trim(),
          name: product.name?.trim() || null,
        }));
      return products.length > 0 ? products : null;
    } catch {
      // try next workspace root
    }
  }
  return null;
}
