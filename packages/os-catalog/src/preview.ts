import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CatalogPreviewSchema,
  PRODUCT_CATALOG_SCHEMA_VERSION,
  assertNoForbiddenProductFields,
  type CatalogPreview,
  type ProductProvenance,
  type TechnicalAttribute,
} from '../../os-contracts/src/product-catalog';
import {
  CATALOG_PDF,
  DEDUPE_DECISIONS,
  DOCUMENT_NOTES,
  PRINTED_LABELS_WITHOUT_AMOUNT,
  PRODUCT_DRAFTS,
  REVIEWED_ON,
  SEASON_PDF,
  UNRESOLVED,
  type AppearanceDraft,
  type AttributeDraft,
} from './reviewed-extraction';
import { stableProductId } from './stable-id';

export const PREVIEW_JSON_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../preview/vitri-2026-reviewed.json',
);

const SOURCES = [CATALOG_PDF, SEASON_PDF] as const;

function pageCountFor(filename: string): number {
  const source = SOURCES.find((item) => item.filename === filename);
  if (!source) throw new Error(`unknown_source:${filename}`);
  return source.pageCount;
}

function shaFor(filename: string): string {
  const source = SOURCES.find((item) => item.filename === filename);
  if (!source) throw new Error(`unknown_source:${filename}`);
  return source.sha256;
}

function sortProvenance(items: AppearanceDraft[]): ProductProvenance[] {
  return [...items]
    .map((item) => {
      if (item.page < 1 || item.page > pageCountFor(item.sourceFilename)) {
        throw new Error(`page_out_of_range:${item.sourceFilename}:${item.page}`);
      }
      if (item.sourceSha256 !== shaFor(item.sourceFilename)) {
        throw new Error(`sha_mismatch:${item.sourceFilename}`);
      }
      return item;
    })
    .sort((left, right) =>
      [left.sourceFilename, left.page, left.role, left.excerpt].join('\0').localeCompare(
        [right.sourceFilename, right.page, right.role, right.excerpt].join('\0'),
      ),
    );
}

function sortAttributes(items: AttributeDraft[]): TechnicalAttribute[] {
  return [...items]
    .map((item) => {
      if (item.page < 1 || item.page > pageCountFor(item.sourceFilename)) {
        throw new Error(`page_out_of_range:${item.sourceFilename}:${item.page}`);
      }
      return item;
    })
    .sort((left, right) =>
      [left.key, left.sourceFilename, String(left.page), left.value].join('\0').localeCompare(
        [right.key, right.sourceFilename, String(right.page), right.value].join('\0'),
      ),
    );
}

export function buildReviewedPreview(): CatalogPreview {
  const products = PRODUCT_DRAFTS.map((draft) => ({
    id: stableProductId(draft.canonicalKey),
    businessCode: null,
    name: draft.name,
    category: draft.category,
    description: draft.description,
    active: true as const,
    provenance: sortProvenance(draft.provenance),
    canonicalKey: draft.canonicalKey,
    aliases: [...draft.aliases].sort((left, right) => left.localeCompare(right)),
    attributes: sortAttributes(draft.attributes),
    reviewStatus: draft.reviewStatus,
    reviewNotes: draft.reviewNotes,
  })).sort((left, right) => left.canonicalKey.localeCompare(right.canonicalKey));

  const preview = {
    schemaVersion: PRODUCT_CATALOG_SCHEMA_VERSION,
    kind: 'reviewed_extraction_preview' as const,
    importExecuted: false as const,
    isPriceList: false as const,
    reviewedOn: REVIEWED_ON,
    productCount: products.length,
    sources: SOURCES.map((source) => ({
      filename: source.filename,
      sha256: source.sha256,
      byteSize: source.byteSize,
      pageCount: source.pageCount,
      coverLabel: source.coverLabel,
    })),
    products,
    unresolved: UNRESOLVED,
    dedupeDecisions: DEDUPE_DECISIONS,
    documentNotes: DOCUMENT_NOTES,
    printedLabelsWithoutAmount: PRINTED_LABELS_WITHOUT_AMOUNT,
  };

  assertNoForbiddenProductFields(preview);
  const parsed = CatalogPreviewSchema.parse(preview);
  if (parsed.productCount !== parsed.products.length) {
    throw new Error('product_count_mismatch');
  }
  return parsed;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortValue((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function canonicalPreviewJson(preview: CatalogPreview = buildReviewedPreview()): string {
  return `${JSON.stringify(sortValue(preview), null, 2)}\n`;
}
