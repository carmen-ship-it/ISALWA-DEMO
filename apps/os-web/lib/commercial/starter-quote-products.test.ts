import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  DEMO_PRICE_COPY,
  DEMO_STARTER_UNIT_PRICES_BOB,
  demoUnitPriceForMode,
  getDemoUnitPrice,
} from './demo-starter-prices';
import { resolveAddQuoteLineDraft } from './product-picker';
import {
  KNOWN_PRODUCT_MODE_LABEL,
  STARTER_PRODUCT_CATEGORIES,
  STARTER_QUOTE_PRODUCTS,
  activeStarterQuoteProducts,
  blankLineEntry,
  isStarterQuoteProductKey,
  prefillFromStarterProduct,
  starterProductByKey,
} from './starter-quote-products';

const picker = readFileSync(resolve('components/commercial/quote-product-picker.tsx'), 'utf8');
const actions = readFileSync(resolve('lib/commercial/actions.ts'), 'utf8');
const editor = readFileSync(resolve('components/commercial/quote-editor.tsx'), 'utf8');
const page = readFileSync(
  resolve('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
  'utf8',
);

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
];

const FORBIDDEN_CLAIM =
  /catálogo integrado|catálogo oficial|stock disponible|inventario|precio oficial|precio vigente|lista oficial|precio de catálogo|precio real|Catálogo de productos — próximamente|Disponible|Sin stock|Existencia/i;

describe('starter quote products', () => {
  it('uses the exact 21 approved names and no synthetic extras', () => {
    assert.equal(STARTER_QUOTE_PRODUCTS.length, 21);
    assert.deepEqual(
      STARTER_QUOTE_PRODUCTS.map((product) => product.name),
      EXPECTED_NAMES,
    );
    assert.deepEqual([...STARTER_PRODUCT_CATEGORIES], [
      'Sanitarios',
      'Lavamanos',
      'Tanques',
      'Urinarios',
    ]);
    assert.equal(new Set(STARTER_QUOTE_PRODUCTS.map((product) => product.category)).size, 4);
    for (const product of STARTER_QUOTE_PRODUCTS) {
      assert.equal(product.active, true);
      assert.equal(product.unit, 'unidad');
      assert.equal('defaultUnitPrice' in product, false);
      assert.equal(product.name.includes(product.key), false);
    }
    const names = new Set(EXPECTED_NAMES);
    assert.equal(names.has('Set Capri'), false);
    assert.equal(names.has('Bowl Luma'), false);
    assert.equal(names.has('Tanque Milan'), false);
    assert.equal(names.has('Urinario Acqua'), false);
  });

  it('known-product mode renders and special-item mode renders', () => {
    assert.equal(KNOWN_PRODUCT_MODE_LABEL, 'Producto conocido');
    assert.match(picker, /KNOWN_PRODUCT_MODE_LABEL/);
    assert.match(picker, /SPECIAL_ITEM_LABEL/);
    assert.match(picker, /mode === 'known' \? 'primary'/);
    assert.match(picker, /mode === 'special' \? 'primary'/);
    assert.match(picker, /Buscar producto/);
    assert.match(picker, /STARTER_PRODUCT_CATEGORIES\.map/);
    assert.match(picker, /QuantityStepper/);
  });

  it('prefills name, short detail, and unit, and leaves price blank unless a demo fixture is passed', () => {
    const capri = starterProductByKey('sanitario-capri');
    const tank = starterProductByKey('tanque-alto');
    assert.ok(capri);
    assert.ok(tank);

    const described = prefillFromStarterProduct(capri);
    assert.equal(described.name, 'Sanitario Capri');
    assert.equal(described.detail, 'Sanitario cerámico');
    assert.equal(described.unit, 'unidad');
    assert.equal(described.unitPrice, '');
    assert.equal(described.note, '');
    assert.equal(described.quantity, '1');

    const bare = prefillFromStarterProduct(tank);
    assert.equal(bare.name, 'Tanque Alto');
    assert.equal(bare.detail, '');
    assert.equal(bare.unit, 'unidad');
    assert.equal(bare.unitPrice, '');

    const demo = prefillFromStarterProduct(capri, { demoUnitPrice: 850 });
    assert.equal(demo.unitPrice, '850');
    const edited = { ...demo, unitPrice: '800', quantity: '2' };
    assert.equal(edited.unitPrice, '800');
    assert.equal(edited.quantity, '2');
  });

  it('keeps quantity and price editable and saves the edited price, not a starter default', () => {
    assert.match(picker, /name="quantity"/);
    assert.match(picker, /onChange=\{\(quantity\) => patch\(\{ quantity \}\)\}/);
    assert.match(picker, /name="unitPrice"/);
    assert.match(picker, /onChange=\{\(event\) => patch\(\{ unitPrice: event\.target\.value \}\)\}/);
    assert.match(actions, /formData\.get\('unitPrice'\)/);
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'catalog',
      productId: 'sanitario-capri',
      itemName: 'Sanitario Capri',
      itemDetail: 'Sanitario cerámico',
      provenanceNote: '',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal('unitPrice' in resolved.draft, false);
    assert.equal('defaultUnitPrice' in resolved.draft, false);
    assert.equal(resolved.draft.productRef, 'sanitario-capri');
  });

  it('saves a special item without a product selection and without a demo price', () => {
    assert.match(picker, /name="productId"/);
    assert.match(picker, /mode === 'special' \? <input type="hidden" name="productId" value="" \/>/);
    assert.equal(blankLineEntry().unitPrice, '');
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'special',
      productId: '',
      itemName: 'Accesorio especial prueba',
      itemDetail: 'Sin lista',
      provenanceNote: '',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.draft.kind, 'special');
    assert.equal(resolved.draft.productRef.startsWith('off-catalog:'), true);
    assert.equal(resolved.draft.productRef.includes('sanitario-capri'), false);
  });

  it('does not show the starter key or a catalog, stock, or official-price claim', () => {
    const capri = starterProductByKey('sanitario-capri');
    assert.ok(capri);
    assert.match(picker, /\{product\.name\}/);
    assert.doesNotMatch(picker, />\s*\{product\.key\}/);
    assert.doesNotMatch(picker, FORBIDDEN_CLAIM);
    assert.equal(isStarterQuoteProductKey('test-only'), false);
    assert.equal(isStarterQuoteProductKey('set-capri'), true);
    assert.equal(starterProductByKey('set-capri'), null);
  });

  it('prefills the 21 demo fixture prices only in demo mode', () => {
    assert.equal(Object.keys(DEMO_STARTER_UNIT_PRICES_BOB).length, 21);
    assert.equal(DEMO_PRICE_COPY, 'Precio de demostración. Puede modificarlo.');
    assert.equal(getDemoUnitPrice('sanitario-capri'), 850);
    assert.equal(demoUnitPriceForMode('sanitario-capri', 'demo'), 850);
    assert.equal(demoUnitPriceForMode('sanitario-capri', 'real'), null);
    assert.equal(demoUnitPriceForMode('urinario', 'real'), null);
    for (const product of activeStarterQuoteProducts()) {
      assert.equal(demoUnitPriceForMode(product.key, 'real'), null);
      assert.equal(typeof demoUnitPriceForMode(product.key, 'demo'), 'number');
    }
    assert.match(picker, /demoPrices \? getDemoUnitPrice\(key\) : null/);
    assert.match(picker, /DEMO_PRICE_COPY/);
    assert.match(picker, /demoPrices && mode === 'known'/);
    assert.match(editor, /demoPrices = false/);
    assert.match(editor, /demoPrices=\{demoPrices\}/);
    assert.match(page, /demoPrices=\{dataMode === 'demo'\}/);
    assert.doesNotMatch(readFileSync(resolve('lib/commercial/starter-quote-products.ts'), 'utf8'), /850/);
  });
});
