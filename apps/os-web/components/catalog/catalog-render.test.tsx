import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CatalogBrowser, CatalogPrice } from './catalog-browser';
import { ProductCatalogPreview } from './product-catalog-preview';
import { ProductSheetView } from './product-sheet';
import { loadCatalogPage, loadProductSheet } from '@/lib/catalog/catalog-view';
import { CATALOG_COPY } from '@/lib/catalog/copy';
import { loadReviewedPreview } from '@/lib/catalog/reviewed-preview';
import {
  PENDING_SPEC_LABEL,
  PRICE_TO_CONFIRM_LABEL,
} from '../../../../packages/os-catalog/src/presentation';
import { stableProductId } from '../../../../packages/os-catalog/src/stable-id';

// tsx compiles the app's `jsx: preserve` components with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

const preview = loadReviewedPreview();
const page = loadCatalogPage(preview);

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function sheetHtml(key: string): string {
  const result = loadProductSheet(stableProductId(key), preview);
  assert.equal(result.state, 'ready');
  if (result.state !== 'ready') return '';
  return renderToStaticMarkup(<ProductSheetView sheet={result.sheet} />);
}

describe('/productos rendering', () => {
  it('renders the catalog search, filters and one Precio por confirmar per card', () => {
    assert.equal(page.state, 'ready');
    if (page.state !== 'ready') return;
    const html = renderToStaticMarkup(
      <CatalogBrowser cards={page.view.cards} categories={page.view.categories} />,
    );
    assert.match(html, /placeholder="Buscar producto o modelo"/);
    assert.match(html, />Solo activos</);
    for (const category of ['Sanitarios', 'Tanques', 'Lavamanos', 'Urinarios']) {
      assert.ok(html.includes(`>${category}<`), category);
    }
    assert.equal(count(html, PRICE_TO_CONFIRM_LABEL), 25);
    assert.equal(count(html, '>Ver ficha<'), 25);
    assert.equal(count(html, `${CATALOG_COPY.sourceLabel}: `), 25);
    assert.doesNotMatch(html, /Bs\.?\s?\d/);
    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /Agregar a cotización/);
    assert.doesNotMatch(html, /cost|costo|margen|margin/i);
  });

  it('renders an honest empty state when the catalog file is missing', () => {
    const html = renderToStaticMarkup(<ProductCatalogPreview page={{ state: 'missing' }} />);
    assert.ok(html.includes(CATALOG_COPY.missingTitle));
    assert.doesNotMatch(html, /Ver ficha/);
  });

  it('renders an approved price only through CatalogPrice', () => {
    const html = renderToStaticMarkup(
      <CatalogPrice
        display={{ kind: 'approved', entries: [{ context: 'Showroom', amountCentavos: '12345', priceListId: 'pl' }] }}
      />,
    );
    assert.match(html, /123,45/);
    assert.match(html, /Showroom/);
  });

  it('ficha shows description, measures with units, sources, review date and pending PDF check', () => {
    const html = sheetHtml('bari');
    assert.ok(html.includes(CATALOG_COPY.descriptionHeading));
    assert.ok(html.includes('23 cm'));
    assert.ok(html.includes('CatalogoVitriCompleto2026.pdf · p. 11'));
    assert.ok(html.includes('2026-09-14'));
    assert.ok(html.includes(CATALOG_COPY.pdfPending));
    assert.ok(html.includes('Sin condición aprobada'));
    assert.doesNotMatch(html, /Precio|cost|costo|margen|margin/i);
  });

  it('ficha replaces inconsistent values with the pending label', () => {
    const html = sheetHtml('kayak');
    const fieldsOnly = html.split(`>${CATALOG_COPY.reviewHeading}<`)[0]!;
    assert.ok(fieldsOnly.includes(PENDING_SPEC_LABEL));
    assert.ok(!fieldsOnly.includes('94,5'), 'pending value is not shown as truth');
    assert.ok(!fieldsOnly.includes('93,5'));
  });

  it('every rendered field in every ficha is followed by a source line', () => {
    if (!preview) assert.fail('preview missing');
    for (const product of preview.products) {
      const html = sheetHtml(product.canonicalKey);
      const fields = count(html, 'uppercase">');
      const sourceLists = count(html, `aria-label="${CATALOG_COPY.sourceLabel}"`);
      assert.ok(sourceLists >= fields, `${product.canonicalKey}: ${sourceLists} source lists for ${fields} fields`);
    }
  });

  it('page title is Catálogo and quote actions stay out of this lane', () => {
    const source = readFileSync(join(process.cwd(), 'app/(app)/productos/page.tsx'), 'utf8');
    assert.match(source, /CATALOG_COPY\.title/);
    assert.equal(CATALOG_COPY.title, 'Catálogo');
  });
});
