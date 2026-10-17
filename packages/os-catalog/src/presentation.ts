/**
 * Catalog presentation model for /productos.
 * Every presented value carries its source. Inconsistent fields carry the pending label
 * instead of a value and are excluded from automatic answers.
 * A price appears only from an approved, active price list. None exists today.
 * Cost and margin are not part of this model.
 */

import {
  assertNoForbiddenProductFields,
  type CatalogCandidate,
  type CatalogPreview,
  type ProductCategory,
  type TechnicalAttribute,
  type TechnicalAttributeKey,
} from '../../os-contracts/src/product-catalog';
import type { PriceContext } from '../../os-contracts/src/price-list';
import type { CatalogCard } from './browse';
import {
  PDF_CHECK_PENDING,
  REVIEWED_PREVIEW_FILE,
  buildStarterReconciliation,
  historicalKeysFor,
  type PdfCheck,
  type StarterReconciliationRow,
} from './reconciliation';

export const PENDING_SPEC_LABEL = 'Especificación pendiente de revisión';
export const PRICE_TO_CONFIRM_LABEL = 'Precio por confirmar';
export const UNIT_NOT_PRINTED_LABEL = 'unidad no impresa';
export const CONDITION_NOT_APPROVED_LABEL = 'Sin condición aprobada';
export const VARIANTS_NOT_APPROVED_LABEL = 'Variantes y condición por confirmar';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  sanitarios: 'Sanitarios',
  tanques: 'Tanques',
  lavamanos: 'Lavamanos',
  urinarios: 'Urinarios',
};

export type FieldSource = {
  document: string;
  page: number | null;
  section: string;
};

export type PresentedText = {
  value: string;
  sources: FieldSource[];
};

export type FieldGroup = 'measure' | 'compatibility' | 'other';

export type PresentedField = {
  key: TechnicalAttributeKey;
  label: string;
  group: FieldGroup;
  status: 'consistent' | 'pending_review';
  /** null when status is pending_review: no source value is shown as true. */
  value: string | null;
  unit: string | null;
  display: string;
  pendingReason: string | null;
  automaticAnswer: { eligible: boolean; reason: string | null };
  sources: FieldSource[];
};

const FIELD_LABELS: Record<TechnicalAttributeKey, string> = {
  dimensiones: 'Dimensiones H × L × W',
  alto: 'Alto',
  ancho: 'Ancho',
  profundidad: 'Profundidad',
  largo: 'Largo',
  sistemaDescarga: 'Sistema de descarga',
  pesoAproximado: 'Peso aproximado',
  pesoLavamanos: 'Peso lavamanos',
  pesoPedestal: 'Peso pedestal',
  espejoDeAgua: 'Espejo de agua',
  instalacion: 'Instalación',
  metodoDescarga: 'Método de descarga',
  metodoInstalacion: 'Método de instalación',
  distanciaDesaguePared: 'Distancia de desagüe a la pared',
  colores: 'Colores impresos',
  compatibilidadConTanques: 'Compatibilidad con tanques',
  compatibilidadConSanitarios: 'Compatibilidad con sanitarios',
  capacidadDescarga: 'Capacidad de descarga',
  material: 'Material',
  espesor: 'Espesor',
  color: 'Color impreso',
  rebalse: 'Rebalse',
  calidad: 'Calidad impresa',
  composicionImpresa: 'Composición impresa',
};

const MEASURE_KEYS = new Set<TechnicalAttributeKey>([
  'dimensiones',
  'alto',
  'ancho',
  'profundidad',
  'largo',
  'pesoAproximado',
  'pesoLavamanos',
  'pesoPedestal',
  'espejoDeAgua',
  'distanciaDesaguePared',
  'capacidadDescarga',
  'espesor',
]);

const COMPATIBILITY_KEYS = new Set<TechnicalAttributeKey>([
  'compatibilidadConTanques',
  'compatibilidadConSanitarios',
]);

const FIELD_ORDER = Object.keys(FIELD_LABELS) as TechnicalAttributeKey[];

type RecordedContradiction = { keys: TechnicalAttributeKey[]; reason: string };

const DRAIN_UNIT_REASON =
  'La tabla comparativa (p.7 según el JSON revisado) rotula esta distancia en cm con el valor 305; la instalación impresa en las fichas dice 305 mm. Unidad pendiente de revisión.';

/**
 * Contradictions the reviewed JSON records in its review notes across different fields.
 * Same-field disagreements are detected from the values; these are not.
 */
const RECORDED_CONTRADICTIONS: Record<string, readonly RecordedContradiction[]> = {
  'inodoro-capri': [{ keys: ['distanciaDesaguePared'], reason: DRAIN_UNIT_REASON }],
  alti: [{ keys: ['distanciaDesaguePared'], reason: DRAIN_UNIT_REASON }],
  'sanitario-verso': [
    {
      keys: ['sistemaDescarga', 'metodoDescarga'],
      reason:
        'La ficha (p.5) imprime "Por arrastre - anillo abierto" y la tabla (p.7) imprime "Sifónico". Nota de revisión del JSON.',
    },
    { keys: ['distanciaDesaguePared'], reason: DRAIN_UNIT_REASON },
  ],
  'lavamanos-pedestal-capri': [
    {
      keys: ['pesoAproximado', 'pesoLavamanos', 'pesoPedestal'],
      reason:
        'El catálogo 2026 (p.9) imprime 13 Kg/aprox; Vitri2026.2027 (p.5) imprime 9.2 kg lavamanos y 5.8 kg pedestal. No se sumó ni se descartó ninguno. Nota de revisión del JSON.',
    },
  ],
  domino: [
    {
      keys: ['alto', 'largo', 'profundidad'],
      reason:
        'La ficha (p.13) imprime 9,5 × 60,5 × 31 y la tabla (p.17) imprime 31,5 × 60,5 × 10. Nota de revisión del JSON.',
    },
  ],
  kayak: [
    {
      keys: ['alto', 'ancho', 'largo', 'profundidad'],
      reason:
        'La ficha (p.13) y la tabla (p.17) imprimen medidas distintas y no se reconciliaron. Nota de revisión del JSON.',
    },
  ],
};

function jsonSource(canonicalKey: string, path: string): FieldSource {
  return { document: REVIEWED_PREVIEW_FILE, page: null, section: `products[${canonicalKey}].${path}` };
}

function unitOf(attribute: TechnicalAttribute): string | null {
  const inValue = attribute.value.match(/(?:\d|\s)(cm|mm|kg)(?:\/aprox)?\.?$/i);
  if (inValue?.[1]) return inValue[1].toLowerCase();
  const inLabel = attribute.label?.match(/\((cm|mm|kg)\)/i);
  return inLabel?.[1] ? inLabel[1].toLowerCase() : null;
}

function valueHasUnit(value: string): boolean {
  return /(?:\d|\s)(cm|mm|kg)(?:\/aprox)?\.?$/i.test(value);
}

function normalizeValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/kg\/aprox|kg|cm|mm/g, '')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
    .replace(/\.$/, '');
}

function groupOf(key: TechnicalAttributeKey): FieldGroup {
  if (MEASURE_KEYS.has(key)) return 'measure';
  if (COMPATIBILITY_KEYS.has(key)) return 'compatibility';
  return 'other';
}

function attributeSource(attribute: TechnicalAttribute): FieldSource {
  return {
    document: attribute.sourceFilename,
    page: attribute.page,
    section: attribute.label ?? FIELD_LABELS[attribute.key],
  };
}

function presentField(
  product: CatalogCandidate,
  key: TechnicalAttributeKey,
  attributes: TechnicalAttribute[],
): PresentedField {
  const group = groupOf(key);
  const sources = [
    jsonSource(product.canonicalKey, `attributes.${key}`),
    ...attributes.map(attributeSource),
  ];
  const recorded = (RECORDED_CONTRADICTIONS[product.canonicalKey] ?? []).find((item) =>
    item.keys.includes(key),
  );
  const values = new Set(attributes.map((attribute) => normalizeValue(attribute.value)));
  const units = new Set(
    attributes.map(unitOf).filter((unit): unit is string => unit !== null),
  );

  let pendingReason: string | null = recorded?.reason ?? null;
  if (!pendingReason && values.size > 1) {
    pendingReason = 'Las fuentes citadas imprimen valores distintos para este campo.';
  }
  if (!pendingReason && units.size > 1) {
    pendingReason = 'Las fuentes citadas imprimen unidades distintas para este campo.';
  }

  if (pendingReason) {
    return {
      key,
      label: FIELD_LABELS[key],
      group,
      status: 'pending_review',
      value: null,
      unit: null,
      display: PENDING_SPEC_LABEL,
      pendingReason,
      automaticAnswer: { eligible: false, reason: 'inconsistent_sources' },
      sources,
    };
  }

  const first = attributes[0]!;
  const unit = group === 'measure' ? ([...units][0] ?? null) : null;
  let display = first.value;
  if (group === 'measure' && unit && !valueHasUnit(first.value)) display = `${first.value} ${unit}`;
  if (group === 'measure' && !unit) display = `${first.value} (${UNIT_NOT_PRINTED_LABEL})`;
  const unitMissing = group === 'measure' && !unit;

  return {
    key,
    label: FIELD_LABELS[key],
    group,
    status: 'consistent',
    value: first.value,
    unit,
    display,
    pendingReason: null,
    automaticAnswer: unitMissing
      ? { eligible: false, reason: 'unit_not_printed' }
      : { eligible: true, reason: null },
    sources,
  };
}

function presentFields(product: CatalogCandidate): PresentedField[] {
  const byKey = new Map<TechnicalAttributeKey, TechnicalAttribute[]>();
  for (const attribute of product.attributes) {
    byKey.set(attribute.key, [...(byKey.get(attribute.key) ?? []), attribute]);
  }
  return FIELD_ORDER.filter((key) => byKey.has(key)).map((key) =>
    presentField(product, key, byKey.get(key)!),
  );
}

function citationSources(product: CatalogCandidate): FieldSource[] {
  const seen = new Set<string>();
  const out: FieldSource[] = [];
  for (const item of product.provenance) {
    const section = item.printedLabel ?? item.role;
    const id = `${item.sourceFilename}\0${item.page}\0${section}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ document: item.sourceFilename, page: item.page, section });
  }
  return out;
}

function descriptionSources(product: CatalogCandidate): FieldSource[] {
  const description = product.description ?? '';
  const sentences = description
    .split(/\.\s+/)
    .map((sentence) => sentence.replace(/\.$/, '').trim())
    .filter((sentence) => sentence.length > 0);
  return product.provenance
    .filter((item) => sentences.some((sentence) => item.excerpt.includes(sentence)))
    .map((item) => ({
      document: item.sourceFilename,
      page: item.page,
      section: item.printedLabel ?? item.role,
    }));
}

export type ApprovedImage = { src: string; alt: string; approvedBy: string; approvedAt: string };

export type ProductSheet = {
  id: string;
  canonicalKey: string;
  active: boolean;
  name: PresentedText;
  category: PresentedText & { key: ProductCategory };
  description: PresentedText | null;
  measures: PresentedField[];
  compatibility: PresentedField[];
  otherAttributes: PresentedField[];
  condition: { approved: null; label: string };
  approvedVariants: readonly string[];
  approvedImage: ApprovedImage | null;
  printedAliases: string[];
  historicalKeys: string[];
  reviewStatus: CatalogCandidate['reviewStatus'];
  reviewNotes: string[];
  reviewedOn: string;
  sourcePages: FieldSource[];
  pdfCheck: PdfCheck;
  pendingFieldCount: number;
};

export function buildProductSheet(
  preview: CatalogPreview,
  product: CatalogCandidate,
  rows: readonly StarterReconciliationRow[] = buildStarterReconciliation(),
): ProductSheet {
  const fields = presentFields(product);
  const citations = citationSources(product);
  const sheet: ProductSheet = {
    id: product.id,
    canonicalKey: product.canonicalKey,
    active: product.active,
    name: {
      value: product.name,
      sources: [jsonSource(product.canonicalKey, 'name'), ...citations],
    },
    category: {
      key: product.category,
      value: CATEGORY_LABELS[product.category],
      sources: [jsonSource(product.canonicalKey, 'category')],
    },
    description: product.description
      ? {
          value: product.description,
          sources: [
            jsonSource(product.canonicalKey, 'description'),
            ...descriptionSources(product),
          ],
        }
      : null,
    measures: fields.filter((field) => field.group === 'measure'),
    compatibility: fields.filter((field) => field.group === 'compatibility'),
    otherAttributes: fields.filter((field) => field.group === 'other'),
    condition: { approved: null, label: CONDITION_NOT_APPROVED_LABEL },
    approvedVariants: [],
    approvedImage: null,
    printedAliases: [...product.aliases],
    historicalKeys: historicalKeysFor(product.canonicalKey, rows),
    reviewStatus: product.reviewStatus,
    reviewNotes: [...product.reviewNotes],
    reviewedOn: preview.reviewedOn,
    sourcePages: citations,
    pdfCheck: PDF_CHECK_PENDING,
    pendingFieldCount: fields.filter((field) => field.status === 'pending_review').length,
  };
  assertNoForbiddenProductFields(sheet);
  return sheet;
}

/** Fields a later automatic answer may quote. Pending or unit-less values are never in it. */
export function automaticAnswerFields(sheet: ProductSheet): PresentedField[] {
  return [...sheet.measures, ...sheet.compatibility, ...sheet.otherAttributes].filter(
    (field) => field.automaticAnswer.eligible,
  );
}

export type CatalogPriceCandidate = {
  productId: string;
  context: PriceContext;
  amountCentavos: string;
  currency: 'BOB';
  basis: 'approved_price_list' | 'historical_transaction' | 'source_document';
  priceListId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  activeFrom: string | null;
  activeUntil: string | null;
};

/** No approved price list exists. Callers pass this until one is approved and loaded. */
export const NO_APPROVED_CATALOG_PRICES: readonly CatalogPriceCandidate[] = [];

export type PriceDisplay =
  | { kind: 'to_confirm'; label: typeof PRICE_TO_CONFIRM_LABEL }
  | {
      kind: 'approved';
      entries: Array<{ context: PriceContext; amountCentavos: string; priceListId: string }>;
    };

function isApprovedAndActive(candidate: CatalogPriceCandidate, at: Date): boolean {
  if (candidate.basis !== 'approved_price_list') return false;
  if (!candidate.priceListId || !candidate.approvedBy || !candidate.approvedAt) return false;
  if (!candidate.activeFrom || Number.isNaN(Date.parse(candidate.activeFrom))) return false;
  if (!/^\d+$/.test(candidate.amountCentavos)) return false;
  if (Date.parse(candidate.activeFrom) > at.getTime()) return false;
  if (candidate.activeUntil && Date.parse(candidate.activeUntil) <= at.getTime()) return false;
  return true;
}

export function catalogPriceDisplay(
  productId: string,
  candidates: readonly CatalogPriceCandidate[],
  at: Date,
): PriceDisplay {
  const entries = candidates
    .filter((candidate) => candidate.productId === productId && isApprovedAndActive(candidate, at))
    .map((candidate) => ({
      context: candidate.context,
      amountCentavos: candidate.amountCentavos,
      priceListId: candidate.priceListId!,
    }));
  if (entries.length === 0) return { kind: 'to_confirm', label: PRICE_TO_CONFIRM_LABEL };
  return { kind: 'approved', entries };
}

export type CatalogProductCard = CatalogCard & {
  active: boolean;
  categoryLabel: string;
  href: string;
  approvedImage: ApprovedImage | null;
  variantsLabel: string;
  priceDisplay: PriceDisplay;
  nameSources: FieldSource[];
  categorySources: FieldSource[];
  pendingFieldCount: number;
};

export type CatalogView = {
  reviewedOn: string;
  pdfCheck: PdfCheck;
  cards: CatalogProductCard[];
  categories: Array<{ key: ProductCategory; label: string }>;
  unresolved: CatalogPreview['unresolved'];
};

export function buildCatalogView(
  preview: CatalogPreview,
  options: { approvedPrices: readonly CatalogPriceCandidate[]; at: Date },
): CatalogView {
  const rows = buildStarterReconciliation();
  const cards = preview.products.map((product): CatalogProductCard => {
    const sheet = buildProductSheet(preview, product, rows);
    const starterNames = rows
      .filter((row) => row.canonicalKey === product.canonicalKey && row.starterName)
      .map((row) => row.starterName!);
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      categoryLabel: sheet.category.value,
      description: product.description,
      businessCode: null,
      reviewStatus: product.reviewStatus,
      attributeValues: [...sheet.measures, ...sheet.compatibility, ...sheet.otherAttributes]
        .filter((field) => field.status === 'consistent')
        .map((field) => field.display),
      aliases: [...new Set([...product.aliases, ...starterNames, ...sheet.historicalKeys])],
      active: product.active,
      href: `/productos/${product.id}`,
      approvedImage: sheet.approvedImage,
      variantsLabel: VARIANTS_NOT_APPROVED_LABEL,
      priceDisplay: catalogPriceDisplay(product.id, options.approvedPrices, options.at),
      nameSources: sheet.name.sources,
      categorySources: sheet.category.sources,
      pendingFieldCount: sheet.pendingFieldCount,
    };
  });
  const categoryKeys = [...new Set(preview.products.map((product) => product.category))];
  const view: CatalogView = {
    reviewedOn: preview.reviewedOn,
    pdfCheck: PDF_CHECK_PENDING,
    cards,
    categories: categoryKeys.map((key) => ({ key, label: CATEGORY_LABELS[key] })),
    unresolved: preview.unresolved,
  };
  assertNoForbiddenProductFields(view);
  return view;
}

export function findProductSheet(
  preview: CatalogPreview,
  productId: string,
): ProductSheet | null {
  const product = preview.products.find((item) => item.id === productId);
  return product ? buildProductSheet(preview, product) : null;
}
