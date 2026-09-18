import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { PRODUCT_DRAFTS } from '../../../../packages/os-catalog/src/reviewed-extraction';
import { resolveAddQuoteLineDraft } from './product-picker';
import {
  KNOWN_PRODUCT_MODE_LABEL,
  STARTER_QUOTE_PRODUCTS,
  activeStarterQuoteProducts,
  blankLineEntry,
  isStarterQuoteProductKey,
  prefillFromStarterProduct,
  starterProductByKey,
  type StarterQuoteProduct,
} from './starter-quote-products';

const picker = readFileSync(resolve('components/commercial/quote-product-picker.tsx'), 'utf8');
const actions = readFileSync(resolve('lib/commercial/actions.ts'), 'utf8');

const FORBIDDEN_CLAIM =
  /catálogo integrado|catálogo oficial|stock disponible|inventario|precio oficial|Catálogo de productos — próximamente/i;

describe('starter quote products', () => {
  it('uses the reviewed product drafts and does not invent price or unit', () => {
    assert.equal(STARTER_QUOTE_PRODUCTS.length, PRODUCT_DRAFTS.length);
    assert.ok(STARTER_QUOTE_PRODUCTS.length > 0);
    for (const [index, product] of STARTER_QUOTE_PRODUCTS.entries()) {
      const source = PRODUCT_DRAFTS[index];
      assert.ok(source);
      assert.equal(product.key, source.canonicalKey);
      assert.equal(product.name, source.name);
      assert.equal(product.active, true);
      assert.equal('defaultUnitPrice' in product, false);
      assert.equal('unit' in product, false);
      if (source.description?.trim()) {
        assert.equal(product.description, source.description.trim());
      } else {
        assert.equal('description' in product, false);
      }
    }
  });

  it('known-product mode renders and special-item mode renders', () => {
    assert.equal(KNOWN_PRODUCT_MODE_LABEL, 'Producto conocido');
    assert.match(picker, /KNOWN_PRODUCT_MODE_LABEL/);
    assert.match(picker, /SPECIAL_ITEM_LABEL/);
    assert.match(picker, /mode === 'known' \? 'primary'/);
    assert.match(picker, /mode === 'special' \? 'primary'/);
  });

  it('prefills name, and description, unit, and price only when the source has them', () => {
    const withDescription = activeStarterQuoteProducts().find((product) => product.description);
    const withoutDescription = activeStarterQuoteProducts().find((product) => !product.description);
    assert.ok(withDescription);
    assert.ok(withoutDescription);

    const described = prefillFromStarterProduct(withDescription);
    assert.equal(described.name, withDescription.name);
    assert.equal(described.detail, withDescription.description);
    assert.equal(described.unit, '');
    assert.equal(described.unitPrice, '');
    assert.equal(described.note, '');

    const bare = prefillFromStarterProduct(withoutDescription);
    assert.equal(bare.name, withoutDescription.name);
    assert.equal(bare.detail, '');
    assert.equal(bare.unit, '');
    assert.equal(bare.unitPrice, '');

    const priced: StarterQuoteProduct = {
      key: 'test-only',
      name: 'Prueba',
      unit: 'm2',
      defaultUnitPrice: 100,
      active: true,
    };
    const filled = prefillFromStarterProduct(priced);
    assert.equal(filled.unit, 'm2');
    assert.equal(filled.unitPrice, '100');
    assert.equal(isStarterQuoteProductKey('test-only'), false);
  });

  it('keeps quantity and price editable and saves the edited price', () => {
    assert.match(picker, /name="quantity"/);
    assert.match(picker, /onChange=\{\(event\) => patch\(\{ quantity: event\.target\.value \}\)\}/);
    assert.match(picker, /name="unitPrice"/);
    assert.match(picker, /onChange=\{\(event\) => patch\(\{ unitPrice: event\.target\.value \}\)\}/);
    assert.match(actions, /formData\.get\('unitPrice'\)/);
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'catalog',
      productId: 'set-capri',
      itemName: 'Set Capri',
      itemDetail: 'Detalle editado',
      provenanceNote: '',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal('unitPrice' in resolved.draft, false);
    assert.equal('defaultUnitPrice' in resolved.draft, false);
  });

  it('saves a special item without a product selection', () => {
    assert.match(picker, /value=\{mode === 'known' \? productKey : ''\}/);
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'special',
      productId: '',
      itemName: 'Pieza a medida',
      itemDetail: 'Sin lista',
      provenanceNote: '',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.draft.kind, 'special');
    assert.equal(resolved.draft.productRef.startsWith('off-catalog:'), true);
    assert.equal(resolved.draft.productRef.includes('set-capri'), false);
  });

  it('does not show the starter key or a catalog integration claim', () => {
    const capri = starterProductByKey('set-capri');
    assert.ok(capri);
    assert.match(picker, /<option key=\{product\.key\} value=\{product\.key\}>\s*\{product\.name\}/);
    assert.doesNotMatch(picker, />\s*\{product\.key\}/);
    for (const product of activeStarterQuoteProducts()) {
      assert.equal(product.name.includes(product.key), false);
    }
    assert.doesNotMatch(picker, FORBIDDEN_CLAIM);
    const reset = blankLineEntry();
    assert.equal(reset.name, '');
    assert.equal(reset.unitPrice, '');
  });
});
