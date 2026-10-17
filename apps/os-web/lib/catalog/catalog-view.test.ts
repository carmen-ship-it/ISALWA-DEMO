import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  STARTER_QUOTE_PRODUCTS,
  isStarterQuoteProductKey,
} from '../commercial/starter-quote-products';
import { buildStarterReconciliation } from '../../../../packages/os-catalog/src/reconciliation';
import { PRICE_TO_CONFIRM_LABEL } from '../../../../packages/os-catalog/src/presentation';
import { stableProductId } from '../../../../packages/os-catalog/src/stable-id';
import { loadCatalogPage, loadProductSheet } from './catalog-view';
import { loadReviewedPreview, readReviewedPreviewJson } from './reviewed-preview';

describe('catalog view (os-web)', () => {
  const preview = loadReviewedPreview();

  it('loads the reviewed preview from the workspace', () => {
    assert.ok(preview);
    assert.equal(preview.products.length, 25);
  });

  it('every starter21 key maps to a catalog id or is explicitly unmatched', () => {
    const rows = buildStarterReconciliation();
    for (const product of STARTER_QUOTE_PRODUCTS) {
      const row = rows.find((item) => item.starterKey === product.key);
      assert.ok(row, product.key);
      assert.equal(row.starterName, product.name);
      if (row.outcome === 'unmatched') assert.ok(row.basis.length > 0);
      else assert.ok(preview!.products.some((item) => item.id === row.catalogId), product.key);
    }
  });

  it('every reconciled starter key is still a known starter key (no historical key lost)', () => {
    for (const row of buildStarterReconciliation()) {
      assert.equal(isStarterQuoteProductKey(row.starterKey), true, row.starterKey);
    }
  });

  it('every card shows Precio por confirmar while no approved price list exists', () => {
    const page = loadCatalogPage(preview);
    assert.equal(page.state, 'ready');
    if (page.state !== 'ready') return;
    for (const card of page.view.cards) {
      assert.equal(card.priceDisplay.kind, 'to_confirm');
      if (card.priceDisplay.kind === 'to_confirm') assert.equal(card.priceDisplay.label, PRICE_TO_CONFIRM_LABEL);
    }
  });

  it('is honest when the file is missing or malformed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'catalog-'));
    assert.equal(readReviewedPreviewJson([join(dir, 'absent.json')]), null);
    assert.equal(loadReviewedPreview([join(dir, 'absent.json')]), null);
    const malformed = join(dir, 'malformed.json');
    writeFileSync(malformed, JSON.stringify({ products: [{ id: 'x', name: 'Inventado' }] }));
    assert.equal(loadReviewedPreview([malformed]), null);
    const priced = join(dir, 'priced.json');
    writeFileSync(priced, JSON.stringify({ ...preview, isPriceList: true }));
    assert.equal(loadReviewedPreview([priced]), null);
    assert.deepEqual(loadCatalogPage(null), { state: 'missing' });
    assert.deepEqual(loadProductSheet('agatha', null), { state: 'missing' });
  });

  it('resolves the ficha by stable id and redirects historical keys', () => {
    const id = stableProductId('inodoro-capri');
    const ready = loadProductSheet(id, preview);
    assert.equal(ready.state, 'ready');
    assert.deepEqual(loadProductSheet('sanitario-capri', preview), { state: 'redirect', productId: id });
    assert.deepEqual(loadProductSheet('inodoro-capri', preview), { state: 'redirect', productId: id });
    assert.equal(loadProductSheet('tanque-alto', preview).state, 'unmatched');
    assert.equal(loadProductSheet('no-existe', preview).state, 'not_found');
  });
});
