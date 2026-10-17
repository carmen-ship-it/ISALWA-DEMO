import {
  NO_APPROVED_CATALOG_PRICES,
  buildCatalogView,
  buildProductSheet,
  type CatalogView,
  type FieldSource,
  type ProductSheet,
} from '../../../../packages/os-catalog/src/presentation';
import { resolveCatalogKey } from '../../../../packages/os-catalog/src/reconciliation';
import { loadReviewedPreview } from './reviewed-preview';

export type CatalogPageState = { state: 'missing' } | { state: 'ready'; view: CatalogView };

export function loadCatalogPage(
  preview = loadReviewedPreview(),
  at: Date = new Date(),
): CatalogPageState {
  if (!preview) return { state: 'missing' };
  return {
    state: 'ready',
    view: buildCatalogView(preview, { approvedPrices: NO_APPROVED_CATALOG_PRICES, at }),
  };
}

export type ProductSheetState =
  | { state: 'missing' }
  | { state: 'not_found' }
  | { state: 'unmatched'; basis: string }
  | { state: 'redirect'; productId: string }
  | { state: 'ready'; sheet: ProductSheet };

/** Stable ids render; canonical and historical starter keys redirect to the stable id. */
export function loadProductSheet(
  key: string,
  preview = loadReviewedPreview(),
): ProductSheetState {
  if (!preview) return { state: 'missing' };
  const resolved = resolveCatalogKey(preview, decodeURIComponent(key));
  if (!resolved.found) {
    return resolved.reason === 'unmatched_starter_key' && resolved.basis
      ? { state: 'unmatched', basis: resolved.basis }
      : { state: 'not_found' };
  }
  if (resolved.via !== 'catalog_id') return { state: 'redirect', productId: resolved.catalogId };
  const product = preview.products.find((item) => item.id === resolved.catalogId)!;
  return { state: 'ready', sheet: buildProductSheet(preview, product) };
}

export function formatSource(source: FieldSource): string {
  return source.page === null
    ? `${source.document} · ${source.section}`
    : `${source.document} · p. ${source.page} · ${source.section}`;
}
