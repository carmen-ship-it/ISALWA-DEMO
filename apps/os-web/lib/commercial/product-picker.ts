/**
 * Quote product picker.
 *
 * Product Master is not wired yet. Search goes through a port and stays empty
 * until that port is integrated. This module never invents a price: the advisor
 * types the quoted price, and it is not a list price.
 *
 * PRICE_SOURCE_MISSING: there is no governed price list to read.
 */

export const PRICE_SOURCE_MISSING = true as const;

/** Reserved productRef prefix. Not a Product Master id. */
export const OFF_CATALOG_REF_PREFIX = 'off-catalog:';

const OFF_CATALOG_KIND = 'fuera-de-catalogo';
const MIN_SEARCH_LENGTH = 2;
const MAX_PRODUCT_ID_LENGTH = 80;
const MAX_NAME_LENGTH = 180;
const MAX_DETAIL_LENGTH = 1000;
const MAX_PROVENANCE_NOTE_LENGTH = 120;

export const QUOTED_PRICE_LABEL = 'Precio cotizado (Bs.)';
export const QUOTED_PRICE_READ_LABEL = 'Precio cotizado';
export const QUOTED_PRICE_HINT = 'Lo escribe el asesor. No se copia de otro documento.';
export const SPECIAL_ITEM_LABEL = 'Ítem especial / fuera de catálogo';
export const ADD_LINE_NEXT_ACTION =
  'Busque el producto o agregue un ítem especial. El precio lo escribe usted.';
export const CATALOG_UNAVAILABLE_COPY =
  'El catálogo todavía no está conectado. Puede agregar un ítem especial.';
export const CATALOG_NO_MATCH_COPY = 'Ningún producto coincide. Puede agregar un ítem especial.';
export const CATALOG_SEARCH_LABEL = 'Buscar producto';
export const SNAPSHOT_NOTE =
  'Este texto queda en la cotización. Si el producto cambia después, esta línea no se reescribe.';
export const CATALOG_LINK_CAPTION = 'Producto vinculado. El texto queda en esta cotización.';

export type CatalogProductHit = {
  productId: string;
  name: string;
  description: string;
  category: string | null;
  active: boolean;
};

export type ProductSearchQuery = {
  organizationId: string;
  text: string;
};

export type ProductSearchPort = {
  search(query: ProductSearchQuery): Promise<CatalogProductHit[]>;
  /** False until Product Master is integrated. Absent means unavailable. */
  catalogAvailable?: boolean;
};

export const emptyProductSearchPort: ProductSearchPort = {
  catalogAvailable: false,
  async search() {
    return [];
  },
};

export function catalogIsAvailable(port: ProductSearchPort): boolean {
  return port.catalogAvailable === true;
}

export function publicCatalogHit(hit: CatalogProductHit): CatalogProductHit {
  return {
    productId: hit.productId,
    name: hit.name,
    description: hit.description ?? '',
    category: hit.category ?? null,
    active: hit.active !== false,
  };
}

/** Drop inactive rows and any price-like extras. Does not invent products. */
export async function searchCatalog(
  port: ProductSearchPort,
  query: ProductSearchQuery,
): Promise<CatalogProductHit[]> {
  const organizationId = query.organizationId.trim();
  const text = query.text.trim();
  if (!organizationId || text.length < MIN_SEARCH_LENGTH) return [];
  const hits = await port.search({ organizationId, text });
  return hits.filter((hit) => hit.active !== false).map(publicCatalogHit);
}

export function quoteLinesAreEditable(status: string): boolean {
  return status === 'draft';
}

export type QuotedPriceEntry = {
  label: typeof QUOTED_PRICE_LABEL;
  hint: typeof QUOTED_PRICE_HINT;
  /** Always empty. A missing price source must not become a suggested amount. */
  suggestedCentavos: null;
};

export function quotedPriceEntry(_ignoredCatalogPrice?: unknown): QuotedPriceEntry {
  return {
    label: QUOTED_PRICE_LABEL,
    hint: QUOTED_PRICE_HINT,
    suggestedCentavos: null,
  };
}

export function formatDescriptionSnapshot(name: string, detail: string): string {
  const itemName = name.trim().slice(0, MAX_NAME_LENGTH);
  const itemDetail = detail.trim().slice(0, MAX_DETAIL_LENGTH);
  if (!itemName) return itemDetail;
  if (!itemDetail || itemDetail === itemName) return itemName;
  return `${itemName}\n${itemDetail}`;
}

export function isCatalogProductRef(productRef: string | null | undefined): boolean {
  if (!productRef) return false;
  return !productRef.startsWith(OFF_CATALOG_REF_PREFIX);
}

export function isOffCatalogProductRef(productRef: string | null | undefined): boolean {
  return Boolean(productRef?.startsWith(OFF_CATALOG_REF_PREFIX));
}

function isSafeProductId(productId: string): boolean {
  if (!productId || productId.length > MAX_PRODUCT_ID_LENGTH) return false;
  if (productId !== productId.trim()) return false;
  if (productId.startsWith(OFF_CATALOG_REF_PREFIX)) return false;
  return !/[\r\n\u0000]/.test(productId);
}

export function encodeOffCatalogProductRef(note: string): string {
  const cleaned = note.trim().replace(/[\r\n]+/g, ' ').slice(0, MAX_PROVENANCE_NOTE_LENGTH);
  if (!cleaned) return `${OFF_CATALOG_REF_PREFIX}${OFF_CATALOG_KIND}`;
  return `${OFF_CATALOG_REF_PREFIX}${OFF_CATALOG_KIND}:${encodeURIComponent(cleaned)}`;
}

export function decodeOffCatalogNote(productRef: string | null | undefined): string | null {
  if (!isOffCatalogProductRef(productRef) || !productRef) return null;
  const rest = productRef.slice(OFF_CATALOG_REF_PREFIX.length);
  const marker = `${OFF_CATALOG_KIND}:`;
  if (!rest.startsWith(marker)) return null;
  try {
    const note = decodeURIComponent(rest.slice(marker.length)).trim();
    return note || null;
  } catch {
    return null;
  }
}

export type LineProvenanceView = {
  kind: 'catalog' | 'special' | 'unlinked';
  caption: string | null;
  note: string | null;
  priceLabel: typeof QUOTED_PRICE_READ_LABEL;
  priceHint: typeof QUOTED_PRICE_HINT;
};

export function lineProvenanceView(productRef: string | null | undefined): LineProvenanceView {
  if (isOffCatalogProductRef(productRef)) {
    return {
      kind: 'special',
      caption: SPECIAL_ITEM_LABEL,
      note: decodeOffCatalogNote(productRef),
      priceLabel: QUOTED_PRICE_READ_LABEL,
      priceHint: QUOTED_PRICE_HINT,
    };
  }
  if (isCatalogProductRef(productRef)) {
    return {
      kind: 'catalog',
      caption: CATALOG_LINK_CAPTION,
      note: null,
      priceLabel: QUOTED_PRICE_READ_LABEL,
      priceHint: QUOTED_PRICE_HINT,
    };
  }
  return {
    kind: 'unlinked',
    caption: null,
    note: null,
    priceLabel: QUOTED_PRICE_READ_LABEL,
    priceHint: QUOTED_PRICE_HINT,
  };
}

export type QuoteLineDraft = {
  kind: 'catalog' | 'special';
  productRef: string;
  name: string;
  detail: string;
  descriptionSnapshot: string;
  provenanceNote: string | null;
};

export type AddQuoteLineDraftInput = {
  lineKind: string;
  productId: string;
  itemName: string;
  itemDetail: string;
  provenanceNote: string;
};

export type ResolveAddQuoteLineDraftResult =
  | { ok: true; draft: QuoteLineDraft }
  | { ok: false; error: string };

export function resolveAddQuoteLineDraft(
  input: AddQuoteLineDraftInput,
): ResolveAddQuoteLineDraftResult {
  const name = input.itemName.trim().slice(0, MAX_NAME_LENGTH);
  const detail = input.itemDetail.trim().slice(0, MAX_DETAIL_LENGTH);
  if (!name) return { ok: false, error: 'Escriba el nombre del ítem.' };

  if (input.lineKind === 'catalog') {
    const productId = input.productId.trim();
    if (!isSafeProductId(productId)) {
      return { ok: false, error: 'Elija un producto del catálogo.' };
    }
    return {
      ok: true,
      draft: {
        kind: 'catalog',
        productRef: productId,
        name,
        detail,
        descriptionSnapshot: formatDescriptionSnapshot(name, detail),
        provenanceNote: null,
      },
    };
  }

  if (input.lineKind === 'special') {
    const note = input.provenanceNote.trim().replace(/[\r\n]+/g, ' ').slice(0, MAX_PROVENANCE_NOTE_LENGTH);
    return {
      ok: true,
      draft: {
        kind: 'special',
        productRef: encodeOffCatalogProductRef(note),
        name,
        detail,
        descriptionSnapshot: formatDescriptionSnapshot(name, detail),
        provenanceNote: note || null,
      },
    };
  }

  return { ok: false, error: 'Elija un producto o un ítem especial.' };
}

/** Copy name and description now. Later catalog edits must not flow into this object. */
export function snapshotCatalogSelection(hit: CatalogProductHit): QuoteLineDraft {
  const name = hit.name;
  const detail = hit.description ?? '';
  const resolved = resolveAddQuoteLineDraft({
    lineKind: 'catalog',
    productId: hit.productId,
    itemName: name,
    itemDetail: detail,
    provenanceNote: '',
  });
  if (!resolved.ok) {
    throw new Error('INVALID_CATALOG_SELECTION');
  }
  return resolved.draft;
}
