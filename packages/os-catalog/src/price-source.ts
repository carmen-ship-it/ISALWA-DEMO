/**
 * Price source review.
 * SOURCE_EXISTS: the fingerprinted Vitri catalogs are the governed V1 source.
 * DETERMINISTIC STRUCTURED EXTRACTION: not succeeded. Text has no proven amount.
 * Those are different facts. A missing August matrix does not erase the catalogs.
 */

import type { CatalogPreview } from '../../os-contracts/src/product-catalog';
import { reviewGovernedCatalog, type PipelineReview } from './pipeline';

export const AUGUST_2026_PRICE_MATRIX = {
  located: false,
  label: 'August 2026 price matrix',
} as const;

/** Kept so earlier receipts can still name this artifact. It is not the governed source. */
export const MISSING_AUGUST_2026_PRICE_MATRIX = AUGUST_2026_PRICE_MATRIX;

export type CatalogPriceReview = PipelineReview;

export function reviewCatalogPrices(preview: CatalogPreview): CatalogPriceReview {
  return reviewGovernedCatalog(preview);
}
