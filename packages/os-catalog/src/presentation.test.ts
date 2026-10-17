import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findForbiddenProductFields } from '../../os-contracts/src/product-catalog';
import { catalogSurface } from './browse';
import { buildReviewedPreview } from './preview';
import {
  NO_APPROVED_CATALOG_PRICES,
  PENDING_SPEC_LABEL,
  PRICE_TO_CONFIRM_LABEL,
  automaticAnswerFields,
  buildCatalogView,
  buildProductSheet,
  catalogPriceDisplay,
  type CatalogPriceCandidate,
  type PresentedField,
  type ProductSheet,
} from './presentation';
import { stableProductId } from './stable-id';

const at = new Date('2026-10-16T12:00:00.000Z');
const preview = buildReviewedPreview();
const sheets = preview.products.map((product) => buildProductSheet(preview, product));

function sheetFor(key: string): ProductSheet {
  const sheet = sheets.find((item) => item.canonicalKey === key);
  assert.ok(sheet, key);
  return sheet;
}

function fieldsOf(sheet: ProductSheet): PresentedField[] {
  return [...sheet.measures, ...sheet.compatibility, ...sheet.otherAttributes];
}

function field(key: string, attribute: string): PresentedField {
  const found = fieldsOf(sheetFor(key)).find((item) => item.key === attribute);
  assert.ok(found, `${key}.${attribute}`);
  return found;
}

const approved: CatalogPriceCandidate = {
  productId: stableProductId('agatha'),
  context: 'Showroom',
  amountCentavos: '12345',
  currency: 'BOB',
  basis: 'approved_price_list',
  priceListId: 'pl_test',
  approvedBy: 'owner-test',
  approvedAt: '2026-10-01T00:00:00.000Z',
  activeFrom: '2026-10-01T00:00:00.000Z',
  activeUntil: null,
};

describe('catalog presentation', () => {
  it('every presented field carries at least one source', () => {
    for (const sheet of sheets) {
      assert.ok(sheet.name.sources.length > 0);
      assert.ok(sheet.category.sources.length > 0);
      if (sheet.description) assert.ok(sheet.description.sources.length > 0);
      for (const item of fieldsOf(sheet)) {
        assert.ok(item.sources.length > 0, `${sheet.canonicalKey}.${item.key}`);
        assert.ok(
          item.sources.some((source) => source.page !== null),
          `${sheet.canonicalKey}.${item.key} has a page from the reviewed JSON`,
        );
      }
      assert.equal(sheet.pdfCheck.status, 'pending');
    }
  });

  it('shows the pending label for inconsistent fields and excludes them from automatic answers', () => {
    const pending = [
      field('set-cadiz', 'espejoDeAgua'),
      field('alti', 'espejoDeAgua'),
      field('sanitario-verso', 'espejoDeAgua'),
      field('sanitario-verso', 'metodoDescarga'),
      field('kayak', 'ancho'),
      field('domino', 'profundidad'),
      field('domino', 'alto'),
      field('lavamanos-pedestal-capri', 'pesoAproximado'),
    ];
    for (const item of pending) {
      assert.equal(item.status, 'pending_review', item.key);
      assert.equal(item.display, PENDING_SPEC_LABEL);
      assert.equal(item.value, null);
      assert.equal(item.automaticAnswer.eligible, false);
      assert.ok(item.pendingReason);
    }
    for (const sheet of sheets) {
      for (const item of automaticAnswerFields(sheet)) {
        assert.equal(item.status, 'consistent');
      }
    }
  });

  it('keeps consistent values that only differ in typography', () => {
    const dims = field('set-capri', 'dimensiones');
    assert.equal(dims.status, 'consistent');
    assert.equal(dims.unit, 'cm');
    assert.match(dims.display, /cm$/);
    assert.equal(field('urinario-acqua', 'alto').status, 'consistent');
    assert.equal(field('domino', 'ancho').status, 'consistent');
  });

  it('marks measures without a printed unit and keeps them out of automatic answers', () => {
    const capacity = field('tanque-capri', 'capacidadDescarga');
    assert.equal(capacity.unit, null);
    assert.match(capacity.display, /unidad no impresa/);
    assert.equal(capacity.automaticAnswer.eligible, false);
  });

  it('has no approved image, variant or condition today', () => {
    for (const sheet of sheets) {
      assert.equal(sheet.approvedImage, null);
      assert.deepEqual(sheet.approvedVariants, []);
      assert.equal(sheet.condition.approved, null);
    }
  });

  it('every card without an approved price shows Precio por confirmar', () => {
    const view = buildCatalogView(preview, { approvedPrices: NO_APPROVED_CATALOG_PRICES, at });
    assert.equal(view.cards.length, 25);
    for (const card of view.cards) {
      assert.deepEqual(card.priceDisplay, { kind: 'to_confirm', label: PRICE_TO_CONFIRM_LABEL });
      assert.ok(card.nameSources.length > 0);
      assert.ok(card.categorySources.length > 0);
      assert.equal(card.href, `/productos/${card.id}`);
    }
  });

  it('shows a price only from an approved, active price list', () => {
    const id = approved.productId;
    assert.equal(catalogPriceDisplay(id, [approved], at).kind, 'approved');
    const rejected: CatalogPriceCandidate[] = [
      { ...approved, basis: 'historical_transaction' },
      { ...approved, basis: 'source_document' },
      { ...approved, approvedBy: null },
      { ...approved, approvedAt: null },
      { ...approved, priceListId: null },
      { ...approved, activeFrom: '2026-11-01T00:00:00.000Z' },
      { ...approved, activeUntil: '2026-10-10T00:00:00.000Z' },
      { ...approved, amountCentavos: '12.5' },
      { ...approved, productId: stableProductId('bari') },
    ];
    for (const candidate of rejected) {
      assert.equal(catalogPriceDisplay(id, [candidate], at).kind, 'to_confirm', JSON.stringify(candidate));
    }
  });

  it('exposes no cost, margin or other forbidden field', () => {
    const view = buildCatalogView(preview, { approvedPrices: [approved], at });
    assert.deepEqual(findForbiddenProductFields(view), []);
    for (const sheet of sheets) assert.deepEqual(findForbiddenProductFields(sheet), []);
    const serialized = JSON.stringify(view) + JSON.stringify(sheets);
    assert.doesNotMatch(serialized, /"(cost|costo|margin|margen)[A-Za-z]*"\s*:/i);
  });

  it('searches by product, model alias or historical key and filters active', () => {
    const view = buildCatalogView(preview, { approvedPrices: NO_APPROVED_CATALOG_PRICES, at });
    const find = (query: string) =>
      catalogSurface({ status: 'ready', products: view.cards, query, category: null, activeOnly: true });
    assert.ok(find('sanitario-capri').items.some((card) => card.id === stableProductId('inodoro-capri')));
    assert.ok(find('Urinario').items.some((card) => card.id === stableProductId('urinario-acqua')));
    const inactive = view.cards.map((card, index) => (index === 0 ? { ...card, active: false } : card));
    const activeOnly = catalogSurface({ status: 'ready', products: inactive, query: '', category: null, activeOnly: true });
    assert.equal(activeOnly.items.length, 24);
    const all = catalogSurface({ status: 'ready', products: inactive, query: '', category: null, activeOnly: false });
    assert.equal(all.items.length, 25);
  });
});
