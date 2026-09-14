/**
 * Preview, import, and review for the governed Vitri catalogs.
 * Fingerprinted, idempotent, auditable, and reversible by deactivation.
 * Does not open a database, copy a PDF, or invent an amount or a commercial code.
 */

import { createHash } from 'node:crypto';
import type { CatalogPreview } from '../../os-contracts/src/product-catalog';
import {
  PRICE_CONTEXTS,
  PRICE_CURRENCY,
  PRICE_MATCH_REVIEW,
  PRICE_MATCH_VERIFIED,
  TenantCommercialCatalog,
  extractCurrencyCentavos,
  matchPriceObservation,
  type PriceContext,
  type PriceEntry,
  type PriceList,
  type PriceMatchReview,
} from '../../os-contracts/src/price-list';
import { MemoryProductCatalog } from './catalog';
import { canonicalPreviewJson } from './preview';
import {
  EXTRACTION_NOT_SUCCEEDED,
  GOVERNED_V1_SOURCES,
  SOURCE_EXISTS,
  extractionFingerprint,
  sourceFingerprint,
} from './source-material';
export const REVIEW_KIND = {
  additionalArtifact: 'additional_artifact_not_on_disk',
  printedLabel: 'printed_label_without_amount',
  candidate: 'candidate_without_proven_amount',
  amountNotDeterministic: 'amount_not_deterministic',
} as const;

export type ImportAuditAction = 'imported' | 'replayed' | 'deactivated';

export type ImportAuditEvent = {
  at: string;
  action: ImportAuditAction;
};

export type ImportReceipt = {
  id: string;
  organizationId: string;
  sourceStatus: typeof SOURCE_EXISTS;
  structuredExtractionStatus: typeof EXTRACTION_NOT_SUCCEEDED | typeof PRICE_MATCH_VERIFIED;
  sourceFingerprint: string;
  previewFingerprint: string;
  extractionFingerprint: string;
  reviewedCandidateCount: number;
  printedLabelWithoutAmountCount: number;
  additionalArtifactCount: number;
  reviewRequiredCount: number;
  sourcedEntryCount: number;
  productIds: string[];
  priceListId: string | null;
  entryIds: string[];
  businessCodesAssigned: 0;
  active: boolean;
  importedAt: string;
  deactivatedAt: string | null;
  events: ImportAuditEvent[];
};

export type PipelineReview = {
  sourceStatus: typeof SOURCE_EXISTS;
  structuredExtractionSucceeded: boolean;
  entries: PriceEntry[];
  reviews: PriceMatchReview[];
  importExecuted: false;
  isPriceList: false;
  reviewedCandidateCount: number;
  printedLabelWithoutAmountCount: number;
  additionalArtifactCount: number;
  reviewRequiredCount: number;
  sourcedEntryCount: number;
  sourceFingerprint: string;
  extractionFingerprint: string;
};

const AUGUST_MATRIX_REASON =
  'August 2026 price matrix was not on disk. That extra artifact is not the governed source. The Vitri catalogs exist and are fingerprinted. No amount was taken from the missing matrix.';

const LABEL_REASON =
  'Printed PRICE label has no amount and no price context. Text extraction did not prove an amount. No price entry was created.';

const CANDIDATE_REASON =
  'The governed catalogs exist, but no printed amount with an explicit price context matched this product. No price entry was created.';

function review(input: Omit<PriceMatchReview, 'status'>): PriceMatchReview {
  return {
    status: PRICE_MATCH_REVIEW,
    reason: input.reason,
    productId: input.productId,
    context: input.context,
    sourceFilename: input.sourceFilename,
    page: input.page,
    excerpt: input.excerpt,
    kind: input.kind,
  };
}

export function countReviewBuckets(reviews: readonly PriceMatchReview[]): {
  additionalArtifactCount: number;
  printedLabelWithoutAmountCount: number;
  candidateWithoutProvenAmountCount: number;
  reviewRequiredCount: number;
} {
  const additionalArtifactCount = reviews.filter((item) => item.kind === REVIEW_KIND.additionalArtifact).length;
  const printedLabelWithoutAmountCount = reviews.filter((item) => item.kind === REVIEW_KIND.printedLabel).length;
  const candidateWithoutProvenAmountCount = reviews.filter((item) => item.kind === REVIEW_KIND.candidate).length;
  return {
    additionalArtifactCount,
    printedLabelWithoutAmountCount,
    candidateWithoutProvenAmountCount,
    reviewRequiredCount: reviews.length,
  };
}

/**
 * 25 and 28 are different counts.
 * 25 is unique reviewed candidates after collapsing marketing appearances.
 * 28 is the review queue: 1 absent extra artifact + 2 PRICE labels without an amount + 25 candidates without a proven amount.
 */
export function reviewGovernedCatalog(preview: CatalogPreview): PipelineReview {
  const reviews: PriceMatchReview[] = [
    review({
      reason: AUGUST_MATRIX_REASON,
      productId: null,
      context: null,
      sourceFilename: null,
      page: null,
      excerpt: null,
      kind: REVIEW_KIND.additionalArtifact,
    }),
  ];

  for (const label of preview.printedLabelsWithoutAmount) {
    reviews.push(
      review({
        reason: LABEL_REASON,
        productId: null,
        context: null,
        sourceFilename: label.sourceFilename,
        page: label.page,
        excerpt: label.excerpt,
        kind: REVIEW_KIND.printedLabel,
      }),
    );
  }

  for (const product of preview.products) {
    reviews.push(
      review({
        reason: CANDIDATE_REASON,
        productId: product.id,
        context: null,
        sourceFilename: null,
        page: null,
        excerpt: null,
        kind: REVIEW_KIND.candidate,
      }),
    );
  }

  const buckets = countReviewBuckets(reviews);
  if (
    buckets.additionalArtifactCount +
      buckets.printedLabelWithoutAmountCount +
      buckets.candidateWithoutProvenAmountCount !==
    reviews.length
  ) {
    throw new Error('review_count_collapsed');
  }

  return {
    sourceStatus: SOURCE_EXISTS,
    structuredExtractionSucceeded: false,
    entries: [],
    reviews,
    importExecuted: false,
    isPriceList: false,
    reviewedCandidateCount: preview.products.length,
    printedLabelWithoutAmountCount: buckets.printedLabelWithoutAmountCount,
    additionalArtifactCount: buckets.additionalArtifactCount,
    reviewRequiredCount: reviews.length,
    sourcedEntryCount: 0,
    sourceFingerprint: sourceFingerprint(),
    extractionFingerprint: extractionFingerprint(),
  };
}

export type PrintedObservationDraft = {
  sourceFilename: string;
  sourceSha256: string;
  page: number;
  excerpt: string;
  productId: string | null;
};

/**
 * SOURCE_VERIFIED only when one currency amount, one context, and one product id are already proven.
 * This does not read the Vitri PDFs and does not fill an amount that the text does not print.
 */
/**
 * One product only. A shared marketing token such as CAPRI matches several records and stays unresolved.
 */
export function resolveUniqueProductId(
  excerpt: string,
  products: readonly { id: string; name: string; aliases: readonly string[] }[],
): string | null {
  const haystack = excerpt.toLowerCase();
  const names = products.map((product) => product.name.toLowerCase());
  const hits = products.filter((product) => {
    const name = product.name.trim().toLowerCase();
    if (name && haystack.includes(name)) return true;
    return product.aliases.some((alias) => {
      const phrase = alias.trim().toLowerCase();
      if (!phrase || !haystack.includes(phrase)) return false;
      return !names.some((other) => other !== name && other.includes(phrase));
    });
  });
  if (hits.length !== 1) return null;
  return hits[0]?.id ?? null;
}

export function classifyPrintedObservation(
  draft: PrintedObservationDraft,
  priceList: Pick<PriceList, 'id' | 'organizationId' | 'currency'>,
  entryId: string,
): ReturnType<typeof matchPriceObservation> {
  const context = uniqueContext(draft.excerpt);
  const amountCentavos = extractCurrencyCentavos(draft.excerpt);
  return matchPriceObservation(
    {
      sourceFilename: draft.sourceFilename,
      sourceSha256: draft.sourceSha256,
      page: draft.page,
      excerpt: draft.excerpt,
      printedContext: context,
      amountCentavos,
      productId: draft.productId,
    },
    priceList,
    entryId,
  );
}

function uniqueContext(excerpt: string): PriceContext | null {
  const found = PRICE_CONTEXTS.filter((context) => excerpt.toLowerCase().includes(context.toLowerCase()));
  if (found.length !== 1) return null;
  return found[0] ?? null;
}

function receiptId(organizationId: string, sources: string, previewHash: string): string {
  const digest = createHash('sha256')
    .update(`isalwa-price-import:v1:${organizationId}\0${sources}\0${previewHash}`)
    .digest('hex');
  return `imp_${digest.slice(0, 24)}`;
}

function priceListIdFor(receiptIdValue: string): string {
  return `pl_${receiptIdValue.slice(4)}`;
}

function cloneReceipt(receipt: ImportReceipt): ImportReceipt {
  return structuredClone(receipt);
}

/**
 * In-memory import. The same fingerprint in the same organization returns the same receipt.
 * Deactivation keeps the rows and appends an audit event. It does not delete.
 */
export class CatalogPricePipeline {
  private readonly products = new MemoryProductCatalog();
  private readonly prices = new TenantCommercialCatalog();
  private readonly receipts = new Map<string, ImportReceipt>();

  review(preview: CatalogPreview): PipelineReview {
    return reviewGovernedCatalog(preview);
  }

  importPreview(organizationId: string, preview: CatalogPreview, importedAt: string): ImportReceipt {
    const org = organizationId.trim();
    if (!org) throw new Error('organization_required');
    const sources = sourceFingerprint(GOVERNED_V1_SOURCES);
    const previewHash = createHash('sha256').update(canonicalPreviewJson(preview)).digest('hex');
    const id = receiptId(org, sources, previewHash);
    const existing = this.receipts.get(this.key(org, id));
    if (existing) {
      existing.events.push({ at: importedAt, action: 'replayed' });
      return cloneReceipt(existing);
    }

    const reviewed = reviewGovernedCatalog(preview);
    const registered = this.products.registerPreview(org, preview, importedAt);
    if (registered.some((row) => row.businessCode != null)) {
      throw new Error('business_code_invented');
    }
    this.rememberProducts(org, preview);

    const receipt: ImportReceipt = {
      id,
      organizationId: org,
      sourceStatus: SOURCE_EXISTS,
      structuredExtractionStatus: reviewed.structuredExtractionSucceeded
        ? PRICE_MATCH_VERIFIED
        : EXTRACTION_NOT_SUCCEEDED,
      sourceFingerprint: sources,
      previewFingerprint: previewHash,
      extractionFingerprint: reviewed.extractionFingerprint,
      reviewedCandidateCount: reviewed.reviewedCandidateCount,
      printedLabelWithoutAmountCount: reviewed.printedLabelWithoutAmountCount,
      additionalArtifactCount: reviewed.additionalArtifactCount,
      reviewRequiredCount: reviewed.reviewRequiredCount,
      sourcedEntryCount: reviewed.sourcedEntryCount,
      productIds: registered.map((row) => row.id),
      priceListId: null,
      entryIds: [],
      businessCodesAssigned: 0,
      active: true,
      importedAt,
      deactivatedAt: null,
      events: [{ at: importedAt, action: 'imported' }],
    };
    this.receipts.set(this.key(org, id), receipt);
    return cloneReceipt(receipt);
  }

  /**
   * Attaches entries that classifyPrintedObservation already marked SOURCE_VERIFIED.
   * Refuses any entry that was not verified. Does not invent the amount.
   */
  attachVerifiedEntries(
    organizationId: string,
    receiptIdValue: string,
    entries: PriceEntry[],
  ): ImportReceipt {
    const stored = this.receipts.get(this.key(organizationId, receiptIdValue));
    if (!stored) throw new Error('import_not_in_organization');
    if (!stored.active) return cloneReceipt(stored);
    if (entries.length === 0) return cloneReceipt(stored);
    if (entries.some((entry) => entry.organizationId !== organizationId)) {
      throw new Error('price_entry_not_in_organization');
    }
    for (const entry of entries) {
      const proven = matchPriceObservation(
        {
          sourceFilename: entry.source.filename,
          sourceSha256: entry.source.sha256,
          page: entry.source.page,
          excerpt: entry.source.excerpt,
          printedContext: entry.context,
          amountCentavos: entry.amountCentavos,
          productId: entry.productId,
        },
        { id: entry.priceListId, organizationId, currency: entry.currency },
        entry.id,
      );
      if (proven.verification !== PRICE_MATCH_VERIFIED) throw new Error('entry_not_source_verified');
    }
    const listId = stored.priceListId ?? priceListIdFor(stored.id);
    if (!stored.priceListId) {
      this.prices.registerPriceList(fixtureList(organizationId, listId, stored.importedAt, entries[0]));
      stored.priceListId = listId;
    }
    for (const entry of entries) {
      if (stored.entryIds.includes(entry.id)) continue;
      this.prices.registerPriceEntry({ ...entry, priceListId: listId });
      stored.entryIds.push(entry.id);
    }
    stored.sourcedEntryCount = stored.entryIds.length;
    return cloneReceipt(stored);
  }

  deactivate(organizationId: string, receiptIdValue: string, at: string): ImportReceipt {
    const stored = this.receipts.get(this.key(organizationId, receiptIdValue));
    if (!stored) throw new Error('import_not_in_organization');
    if (!stored.active) return cloneReceipt(stored);
    for (const productId of stored.productIds) {
      this.products.deactivate(organizationId, productId, at);
    }
    if (stored.priceListId) {
      this.prices.closePriceList(organizationId, stored.priceListId, at);
    }
    stored.active = false;
    stored.deactivatedAt = at;
    stored.events.push({ at, action: 'deactivated' });
    return cloneReceipt(stored);
  }

  get(organizationId: string, receiptIdValue: string): ImportReceipt | null {
    const stored = this.receipts.get(this.key(organizationId, receiptIdValue));
    return stored ? cloneReceipt(stored) : null;
  }

  productCount(organizationId: string): number {
    return this.products.list(organizationId).length;
  }

  openEntryCount(organizationId: string): number {
    return this.prices.openPriceEntries(organizationId).length;
  }

  private rememberProducts(organizationId: string, preview: CatalogPreview): void {
    for (const product of preview.products) {
      const already = this.prices.readProduct(
        { organizationId, grantedScopes: ['commercial.org.read'] },
        product.id,
      );
      if (already.ok && already.value) continue;
      this.prices.registerProduct({
        id: product.id,
        organizationId,
        businessCode: null,
        name: product.name,
        category: product.category,
        description: product.description,
        aliases: product.aliases,
        attributeValues: product.attributes.map((attribute) => attribute.value),
      });
    }
  }

  private key(organizationId: string, receiptIdValue: string): string {
    return `${organizationId}\0${receiptIdValue}`;
  }
}

function fixtureList(
  organizationId: string,
  id: string,
  importedAt: string,
  entry: PriceEntry | undefined,
): PriceList {
  if (!entry) throw new Error('verified_entry_required');
  return {
    id,
    organizationId,
    version: `verified-${id}`,
    currency: PRICE_CURRENCY,
    effectiveFrom: importedAt,
    effectiveTo: null,
    source: entry.source,
  };
}
