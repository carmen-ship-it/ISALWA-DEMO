/**
 * Product master contract.
 * Not a price list. businessCode is nullable until a person assigns one.
 * Do not invent SKU, price, cost, margin, tax, lead time, stock, or a bill of materials.
 * Not exported from the package barrel in this lane.
 */

import { z } from 'zod';

export const PRODUCT_CATALOG_SCHEMA_VERSION = '1' as const;

export const PRODUCT_CATEGORIES = ['sanitarios', 'tanques', 'lavamanos', 'urinarios'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const APPEARANCE_ROLES = [
  'specification',
  'comparison_table',
  'marketing',
  'index',
  'composition',
  'lifestyle',
] as const;
export type AppearanceRole = (typeof APPEARANCE_ROLES)[number];

export const REVIEW_STATUSES = [
  'spec_page',
  'dimensions_unspecified',
  'named_only',
  'comparison_row_only',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const STATUS_EVENT_REASONS = ['registered', 'deactivated'] as const;
export type StatusEventReason = (typeof STATUS_EVENT_REASONS)[number];

/** Printed technical fields only. A composition sentence is not a bill of materials. */
export const TECHNICAL_ATTRIBUTE_KEYS = [
  'dimensiones',
  'alto',
  'ancho',
  'profundidad',
  'largo',
  'sistemaDescarga',
  'pesoAproximado',
  'pesoLavamanos',
  'pesoPedestal',
  'espejoDeAgua',
  'instalacion',
  'metodoDescarga',
  'metodoInstalacion',
  'distanciaDesaguePared',
  'colores',
  'compatibilidadConTanques',
  'compatibilidadConSanitarios',
  'capacidadDescarga',
  'material',
  'espesor',
  'color',
  'rebalse',
  'calidad',
  'composicionImpresa',
] as const;
export type TechnicalAttributeKey = (typeof TECHNICAL_ATTRIBUTE_KEYS)[number];

/**
 * Rejected wherever they appear as object keys.
 * A disclaimer sentence may still say this is not a price list.
 */
export const FORBIDDEN_PRODUCT_FIELDS = [
  'sku',
  'price',
  'precio',
  'unitPrice',
  'unit_price',
  'cost',
  'costo',
  'margin',
  'margen',
  'tax',
  'impuesto',
  'leadTime',
  'lead_time',
  'plazo',
  'stock',
  'inventario',
  'bom',
  'billOfMaterials',
  'bill_of_materials',
] as const;

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const ProductProvenanceSchema = z
  .object({
    sourceFilename: z.string().min(1),
    sourceSha256: Sha256,
    page: z.number().int().positive(),
    printedLabel: z.string().min(1).nullable(),
    role: z.enum(APPEARANCE_ROLES),
    excerpt: z.string().min(1),
  })
  .strict();

export type ProductProvenance = z.infer<typeof ProductProvenanceSchema>;

export const TechnicalAttributeSchema = z
  .object({
    key: z.enum(TECHNICAL_ATTRIBUTE_KEYS),
    value: z.string().min(1),
    label: z.string().min(1).nullable(),
    sourceFilename: z.string().min(1),
    page: z.number().int().positive(),
  })
  .strict();

export type TechnicalAttribute = z.infer<typeof TechnicalAttributeSchema>;

export const CatalogCandidateSchema = z
  .object({
    id: z.string().min(1),
    businessCode: z.string().min(1).nullable(),
    name: z.string().min(1),
    category: z.enum(PRODUCT_CATEGORIES),
    description: z.string().min(1).nullable(),
    active: z.literal(true),
    provenance: z.array(ProductProvenanceSchema).min(1),
    canonicalKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    aliases: z.array(z.string().min(1)),
    attributes: z.array(TechnicalAttributeSchema),
    reviewStatus: z.enum(REVIEW_STATUSES),
    reviewNotes: z.array(z.string().min(1)),
  })
  .strict();

export type CatalogCandidate = z.infer<typeof CatalogCandidateSchema>;

export const ProductStatusEventSchema = z
  .object({
    at: z.string().datetime(),
    active: z.boolean(),
    reason: z.enum(STATUS_EVENT_REASONS),
  })
  .strict();

export type ProductStatusEvent = z.infer<typeof ProductStatusEventSchema>;

/** Tenant-scoped master row. The id is the stable candidate id. Scope is organizationId. */
export const CatalogProductRecordSchema = z
  .object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    businessCode: z.string().min(1).nullable(),
    name: z.string().min(1),
    category: z.enum(PRODUCT_CATEGORIES),
    description: z.string().min(1).nullable(),
    active: z.boolean(),
    provenance: z.array(ProductProvenanceSchema).min(1),
    canonicalKey: z.string().min(1),
    attributes: z.array(TechnicalAttributeSchema),
    reviewStatus: z.enum(REVIEW_STATUSES),
    reviewNotes: z.array(z.string()),
    deactivatedAt: z.string().datetime().nullable(),
    statusHistory: z.array(ProductStatusEventSchema).min(1),
  })
  .strict();

export type CatalogProductRecord = z.infer<typeof CatalogProductRecordSchema>;

const SourceSchema = z
  .object({
    filename: z.string().min(1),
    sha256: Sha256,
    byteSize: z.number().int().positive(),
    pageCount: z.number().int().positive(),
    coverLabel: z.string().min(1).nullable(),
  })
  .strict();

const UnresolvedAppearanceSchema = z
  .object({
    name: z.string().min(1),
    sourceFilename: z.string().min(1),
    page: z.number().int().positive(),
    excerpt: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const DedupeDecisionSchema = z
  .object({
    canonicalKey: z.string().min(1),
    keptAs: z.string().min(1),
    collapsed: z.array(z.string().min(1)).min(1),
    distinctFrom: z.array(z.string().min(1)),
    reason: z.string().min(1),
  })
  .strict();

const PrintedLabelSchema = z
  .object({
    sourceFilename: z.string().min(1),
    page: z.number().int().positive(),
    excerpt: z.string().min(1),
    amount: z.null(),
  })
  .strict();

export const CatalogPreviewSchema = z
  .object({
    schemaVersion: z.literal(PRODUCT_CATALOG_SCHEMA_VERSION),
    kind: z.literal('reviewed_extraction_preview'),
    importExecuted: z.literal(false),
    isPriceList: z.literal(false),
    reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    productCount: z.number().int().positive(),
    sources: z.array(SourceSchema).min(1),
    products: z.array(CatalogCandidateSchema).min(1),
    unresolved: z.array(UnresolvedAppearanceSchema),
    dedupeDecisions: z.array(DedupeDecisionSchema),
    documentNotes: z.array(z.string().min(1)),
    printedLabelsWithoutAmount: z.array(PrintedLabelSchema),
  })
  .strict();

export type CatalogPreview = z.infer<typeof CatalogPreviewSchema>;

const forbidden = new Set<string>(FORBIDDEN_PRODUCT_FIELDS.map((key) => key.toLowerCase()));

export function isForbiddenProductField(key: string): boolean {
  return forbidden.has(key.toLowerCase());
}

export function findForbiddenProductFields(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenProductFields(item, `${path}[${index}]`));
  }
  if (!value || typeof value !== 'object') return [];
  const found: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key;
    if (isForbiddenProductField(key)) found.push(next);
    found.push(...findForbiddenProductFields(child, next));
  }
  return found;
}

export function assertNoForbiddenProductFields(value: unknown): void {
  const found = findForbiddenProductFields(value);
  if (found.length > 0) {
    throw new Error(`forbidden_product_field:${found.join(',')}`);
  }
}
