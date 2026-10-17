import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CatalogPreviewSchema,
  type CatalogPreview,
} from '../../../../packages/os-contracts/src/product-catalog';

const PREVIEW_CANDIDATES = [
  join(process.cwd(), 'packages/os-catalog/preview/vitri-2026-reviewed.json'),
  join(process.cwd(), '../../packages/os-catalog/preview/vitri-2026-reviewed.json'),
];

/** Raw JSON of the reviewed preview, or null when the file is missing or unreadable. */
export function readReviewedPreviewJson(
  candidates: readonly string[] = PREVIEW_CANDIDATES,
): unknown | null {
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as unknown;
    } catch {
      // try the next workspace root
    }
  }
  return null;
}

/**
 * Schema-checked reviewed preview. A missing, malformed, imported or price-list file is null:
 * the catalog shows an honest empty state instead of guessed products.
 */
export function loadReviewedPreview(
  candidates: readonly string[] = PREVIEW_CANDIDATES,
): CatalogPreview | null {
  const raw = readReviewedPreviewJson(candidates);
  if (raw === null) return null;
  const parsed = CatalogPreviewSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (parsed.data.isPriceList || parsed.data.importExecuted) return null;
  return parsed.data;
}
