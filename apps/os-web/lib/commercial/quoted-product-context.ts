/**
 * Read-only commercial snapshot for downstream screens.
 * Built from saved quote lines. Never from the live starter-product list.
 */

import { isOffCatalogProductRef } from './product-picker';

export const QUOTED_PRODUCTS_TITLE = 'Productos del pedido';
export const QUOTED_QUANTITY_LABEL = 'Cotizado';
export const QUOTED_PRODUCTS_NOTE =
  'Detalle de la cotización. La cantidad es lo cotizado, no stock, producción, compra ni entrega.';
export const QUOTED_PRODUCTS_UNAVAILABLE =
  'No se pudo cargar el detalle de productos de la cotización origen.';
export const QUOTED_CONTEXT_HEADING = 'Detalle del pedido';

export type QuotedProductLine = {
  quoteLineId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitLabel: string | null;
  unitPriceCentavos: string;
  lineTotalCentavos: string;
  specialItem: boolean;
};

type SourceLine = {
  quoteLineId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitLabel: string | null;
  unitPriceCentavos: string;
  lineTotalCentavos: string;
  productRef: string | null;
};

/** Drops internal product refs. Special items stay as first-class lines. */
export function quotedProductsFromQuoteLines(
  lines: readonly SourceLine[] | null | undefined,
): QuotedProductLine[] {
  if (!lines || lines.length === 0) return [];
  return [...lines]
    .sort((left, right) => left.lineNumber - right.lineNumber)
    .map((line) => ({
      quoteLineId: line.quoteLineId,
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      unitLabel: line.unitLabel,
      unitPriceCentavos: line.unitPriceCentavos,
      lineTotalCentavos: line.lineTotalCentavos,
      specialItem: isOffCatalogProductRef(line.productRef),
    }));
}
