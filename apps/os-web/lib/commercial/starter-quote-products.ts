/**
 * Bounded V1 starter products for quote-line entry.
 * Identities come from the reviewed Vitri product drafts.
 * Missing description, unit, and price stay omitted. Nothing here is invented.
 */

import { PRODUCT_DRAFTS } from '../../../../packages/os-catalog/src/reviewed-extraction';

export type StarterQuoteProduct = {
  key: string;
  name: string;
  description?: string;
  unit?: string;
  defaultUnitPrice?: number;
  active: boolean;
};

export const STARTER_LIST_COPY = 'Lista inicial de productos para cotización.';
export const KNOWN_PRODUCT_MODE_LABEL = 'Producto conocido';
export const PRODUCT_FIELD_LABEL = 'Producto';
export const PRODUCT_PLACEHOLDER = 'Seleccionar producto';
export const PRODUCT_DATA_HEADING = 'Datos del producto';
export const SPECIAL_ITEM_HELPER =
  'Use esta opción cuando el producto no esté en la lista o sea un caso especial.';
export const ADD_LINE_HEADING = 'Agregar a la cotización';
export const UNIT_PRICE_LABEL = 'Precio unitario';

/** Existing quote-line quantity default. Not a product fact. */
export const EXISTING_QUANTITY_DEFAULT = '1';

export type StarterLineEntry = {
  name: string;
  detail: string;
  note: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

function toStarter(draft: (typeof PRODUCT_DRAFTS)[number]): StarterQuoteProduct {
  const product: StarterQuoteProduct = {
    key: draft.canonicalKey,
    name: draft.name,
    active: true,
  };
  const description = draft.description?.trim();
  if (description) product.description = description;
  return product;
}

export const STARTER_QUOTE_PRODUCTS: readonly StarterQuoteProduct[] = PRODUCT_DRAFTS.map(toStarter);

export function activeStarterQuoteProducts(): readonly StarterQuoteProduct[] {
  return STARTER_QUOTE_PRODUCTS.filter((product) => product.active);
}

export function starterProductByKey(key: string): StarterQuoteProduct | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  return activeStarterQuoteProducts().find((product) => product.key === trimmed) ?? null;
}

export function isStarterQuoteProductKey(key: string | null | undefined): boolean {
  return starterProductByKey(key ?? '') != null;
}

export function blankLineEntry(): StarterLineEntry {
  return {
    name: '',
    detail: '',
    note: '',
    quantity: EXISTING_QUANTITY_DEFAULT,
    unit: '',
    unitPrice: '',
  };
}

/** Prefill only fields the source actually has. Price and unit stay empty when omitted. */
export function prefillFromStarterProduct(product: StarterQuoteProduct): StarterLineEntry {
  return {
    name: product.name,
    detail: product.description ?? '',
    note: '',
    quantity: EXISTING_QUANTITY_DEFAULT,
    unit: product.unit ?? '',
    unitPrice: product.defaultUnitPrice == null ? '' : String(product.defaultUnitPrice),
  };
}
