/**
 * Price source review. Does not import a database and does not invent an amount.
 * The August 2026 price matrix was not on disk. The catalogs print PRICE without an amount.
 */

import {
  PRICE_MATCH_REVIEW,
  type PriceEntry,
  type PriceMatchReview,
} from '../../os-contracts/src/price-list';
import type { CatalogPreview } from '../../os-contracts/src/product-catalog';

export const MISSING_AUGUST_2026_PRICE_MATRIX = {
  located: false,
  label: 'August 2026 price matrix',
} as const;

export type CatalogPriceReview = {
  entries: PriceEntry[];
  reviews: PriceMatchReview[];
  importExecuted: false;
  isPriceList: false;
};

export function reviewCatalogPrices(preview: CatalogPreview): CatalogPriceReview {
  const reviews: PriceMatchReview[] = [
    {
      status: PRICE_MATCH_REVIEW,
      reason: 'August 2026 price matrix was not found on disk. No price entry was created.',
      productId: null,
      context: null,
      sourceFilename: null,
      page: null,
      excerpt: null,
    },
  ];

  for (const label of preview.printedLabelsWithoutAmount) {
    reviews.push({
      status: PRICE_MATCH_REVIEW,
      reason: 'Printed label has no amount with an explicit price context. No price entry was created.',
      productId: null,
      context: null,
      sourceFilename: label.sourceFilename,
      page: label.page,
      excerpt: label.excerpt,
    });
  }

  for (const product of preview.products) {
    reviews.push({
      status: PRICE_MATCH_REVIEW,
      reason: 'No printed amount with an explicit price context matched this product. No price entry was created.',
      productId: product.id,
      context: null,
      sourceFilename: null,
      page: null,
      excerpt: null,
    });
  }

  return {
    entries: [],
    reviews,
    importExecuted: false,
    isPriceList: false,
  };
}
