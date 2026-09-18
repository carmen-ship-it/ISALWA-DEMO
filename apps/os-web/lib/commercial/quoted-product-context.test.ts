import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  QUOTED_PRODUCTS_NOTE,
  QUOTED_PRODUCTS_TITLE,
  QUOTED_PRODUCTS_UNAVAILABLE,
  QUOTED_QUANTITY_LABEL,
  quotedProductsFromQuoteLines,
} from './quoted-product-context';

const orderPage = readFileSync(
  resolve('app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx'),
  'utf8',
);
const workPage = readFileSync(resolve('app/(app)/trabajo/[workItemId]/page.tsx'), 'utf8');
const delivery = readFileSync(resolve('components/delivery/delivery-documents-panel.tsx'), 'utf8');

describe('quoted product context', () => {
  it('keeps saved quote lines and does not expose starter keys', () => {
    const lines = quotedProductsFromQuoteLines([
      {
        quoteLineId: 'line-b',
        lineNumber: 2,
        description: 'Accesorio especial prueba',
        quantity: 3,
        unitLabel: null,
        unitPriceCentavos: '10000',
        lineTotalCentavos: '30000',
        productRef: 'off-catalog:fuera-de-catalogo',
      },
      {
        quoteLineId: 'line-a',
        lineNumber: 1,
        description: 'Sanitario Capri\nSanitario cerámico',
        quantity: 2,
        unitLabel: 'unidad',
        unitPriceCentavos: '80000',
        lineTotalCentavos: '160000',
        productRef: 'sanitario-capri',
      },
    ]);
    assert.equal(lines[0]?.description, 'Sanitario Capri\nSanitario cerámico');
    assert.equal(lines[0]?.quantity, 2);
    assert.equal(lines[0]?.unitLabel, 'unidad');
    assert.equal(lines[0]?.specialItem, false);
    assert.equal('productRef' in (lines[0] ?? {}), false);
    assert.equal(lines[1]?.specialItem, true);
    assert.equal(lines[1]?.description, 'Accesorio especial prueba');
    assert.equal(quotedProductsFromQuoteLines([]).length, 0);
    assert.equal(quotedProductsFromQuoteLines(null).length, 0);
  });

  it('labels quoted quantity and does not claim stock or delivery', () => {
    assert.equal(QUOTED_QUANTITY_LABEL, 'Cotizado');
    assert.equal(QUOTED_PRODUCTS_TITLE, 'Productos del pedido');
    assert.match(QUOTED_PRODUCTS_NOTE, /cotizado/i);
    assert.doesNotMatch(QUOTED_PRODUCTS_NOTE, /disponible|en almacén|entregado|fabricar/i);
    assert.match(QUOTED_PRODUCTS_UNAVAILABLE, /No se pudo cargar el detalle de productos/);
    assert.match(orderPage, /QuotedProductContext/);
    assert.match(orderPage, /quotedProductsFromQuoteLines/);
    assert.match(workPage, /parseOrderPrepMarker/);
    assert.match(workPage, /QuotedProductContext/);
    assert.match(delivery, /QUOTED_CONTEXT_HEADING/);
    assert.match(delivery, /QUOTED_QUANTITY_LABEL/);
  });
});
