/**
 * Bounded V1 starter products for quote-line entry.
 * The selectable list is the approved 21-name ISALWA/Vitri set.
 * Unit is a quote-entry convenience. There is no approved price.
 */

export type StarterProductCategory = 'Sanitarios' | 'Lavamanos' | 'Tanques' | 'Urinarios';

export type StarterQuoteProduct = {
  key: string;
  name: string;
  category: StarterProductCategory;
  description?: string;
  unit?: string;
  defaultUnitPrice?: number;
  active: boolean;
};

export const STARTER_PRODUCT_CATEGORIES = [
  'Sanitarios',
  'Lavamanos',
  'Tanques',
  'Urinarios',
] as const satisfies readonly StarterProductCategory[];

export const STARTER_LIST_COPY = 'Lista inicial de productos';
export const KNOWN_PRODUCT_MODE_LABEL = 'Producto conocido';
export const PRODUCT_FIELD_LABEL = 'Producto';
export const PRODUCT_PLACEHOLDER = 'Seleccionar producto';
export const PRODUCT_DATA_HEADING = 'Datos del producto';
export const SPECIAL_ITEM_HELPER =
  'Use esta opción cuando el producto no esté en la lista o sea un caso especial.';
export const ADD_LINE_HEADING = 'Agregar a la cotización';
export const UNIT_PRICE_LABEL = 'Precio unitario';
export const STARTER_DEFAULT_UNIT = 'unidad';

/** Existing quote-line quantity default. Not a product fact. */
export const EXISTING_QUANTITY_DEFAULT = '1';

/**
 * Keys already stored on quote lines from the earlier draft list.
 * They stay hidden. They are not selectable.
 */
const RETIRED_STARTER_KEYS = [
  'set-capri',
  'inodoro-capri',
  'set-cadiz',
  'alti',
  'tanque-milan',
  'bowl-domino-embutir',
  'bowl-luma',
  'urinario-acqua',
] as const;

export type StarterLineEntry = {
  name: string;
  detail: string;
  note: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

const EXPECTED_NAMES = [
  'Sanitario Capri',
  'Sanitario Cadiz',
  'Sanitario Verso',
  'Sanitario Alti',
  'Lavamanos con pedestal Capri',
  'Agatha',
  'Bordda',
  'Bari',
  'Bowl New Cuadrado',
  'Bowl Ovale',
  'Domino',
  'Kayak',
  'Solare Blanco',
  'Gris Black',
  'Quaza Blanco Satinado',
  'Turin',
  'Tanque Verso',
  'Tanque Capri',
  'Tanque Cadiz',
  'Tanque Alto',
  'Urinario',
] as const;

function product(
  key: string,
  name: (typeof EXPECTED_NAMES)[number],
  category: StarterProductCategory,
  description?: string,
): StarterQuoteProduct {
  const row: StarterQuoteProduct = {
    key,
    name,
    category,
    unit: STARTER_DEFAULT_UNIT,
    active: true,
  };
  if (description) row.description = description;
  return row;
}

export const STARTER_QUOTE_PRODUCTS: readonly StarterQuoteProduct[] = [
  product('sanitario-capri', 'Sanitario Capri', 'Sanitarios', 'Sanitario cerámico'),
  product('sanitario-cadiz', 'Sanitario Cadiz', 'Sanitarios', 'Sanitario cerámico'),
  product('sanitario-verso', 'Sanitario Verso', 'Sanitarios', 'Sanitario cerámico'),
  product('sanitario-alti', 'Sanitario Alti', 'Sanitarios', 'Sanitario cerámico'),
  product(
    'lavamanos-pedestal-capri',
    'Lavamanos con pedestal Capri',
    'Lavamanos',
    'Lavamanos con pedestal',
  ),
  product('agatha', 'Agatha', 'Lavamanos', 'Lavamanos'),
  product('bordda', 'Bordda', 'Lavamanos', 'Lavamanos'),
  product('bari', 'Bari', 'Lavamanos', 'Lavamanos'),
  product('bowl-new-cuadrado', 'Bowl New Cuadrado', 'Lavamanos', 'Lavamanos'),
  product('bowl-ovale', 'Bowl Ovale', 'Lavamanos', 'Lavamanos'),
  product('domino', 'Domino', 'Lavamanos', 'Lavamanos'),
  product('kayak', 'Kayak', 'Lavamanos', 'Lavamanos'),
  product('solare-blanco', 'Solare Blanco', 'Lavamanos', 'Lavamanos'),
  product('gris-black', 'Gris Black', 'Lavamanos', 'Lavamanos'),
  product('quaza-blanco-satinado', 'Quaza Blanco Satinado', 'Lavamanos', 'Lavamanos'),
  product('turin', 'Turin', 'Lavamanos', 'Lavamanos'),
  product('tanque-verso', 'Tanque Verso', 'Tanques'),
  product('tanque-capri', 'Tanque Capri', 'Tanques'),
  product('tanque-cadiz', 'Tanque Cadiz', 'Tanques'),
  product('tanque-alto', 'Tanque Alto', 'Tanques'),
  product('urinario', 'Urinario', 'Urinarios', 'Urinario'),
];

export function activeStarterQuoteProducts(): readonly StarterQuoteProduct[] {
  return STARTER_QUOTE_PRODUCTS.filter((row) => row.active);
}

export function starterProductsByCategory(
  category: StarterProductCategory,
): readonly StarterQuoteProduct[] {
  return activeStarterQuoteProducts().filter((row) => row.category === category);
}

export function starterProductByKey(key: string): StarterQuoteProduct | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  return activeStarterQuoteProducts().find((row) => row.key === trimmed) ?? null;
}

export function isStarterQuoteProductKey(key: string | null | undefined): boolean {
  const trimmed = key?.trim() ?? '';
  if (!trimmed) return false;
  if (starterProductByKey(trimmed)) return true;
  return (RETIRED_STARTER_KEYS as readonly string[]).includes(trimmed);
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

/**
 * Prefill name, a short description when one exists, and the editable unit.
 * Price is filled only when the caller passes a demo fixture. Product identity has no price.
 */
export function prefillFromStarterProduct(
  row: StarterQuoteProduct,
  options?: { demoUnitPrice?: number | null },
): StarterLineEntry {
  const demoUnitPrice = options?.demoUnitPrice;
  return {
    name: row.name,
    detail: row.description ?? '',
    note: '',
    quantity: EXISTING_QUANTITY_DEFAULT,
    unit: row.unit ?? '',
    unitPrice: demoUnitPrice == null ? '' : String(demoUnitPrice),
  };
}
