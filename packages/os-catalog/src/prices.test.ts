import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CATALOG_RESOURCES } from '../../os-contracts/src/product-catalog';
import {
  PRICE_CONTEXTS,
  TenantCommercialCatalog,
  type IsolatedProduct,
  type PriceList,
} from '../../os-contracts/src/price-list';
import { catalogSurface } from './browse';
import { reviewCatalogPrices, MISSING_AUGUST_2026_PRICE_MATRIX } from './price-source';
import { buildReviewedPreview } from './preview';
import { stableProductId } from './stable-id';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
const migrationPath = join(
  repoRoot,
  'packages/os-database/prisma/migrations/20260916100000_os_price_list/migration.sql',
);
const fragmentPath = join(repoRoot, 'packages/os-database/prisma/fragments/price-list.prisma');

const VITRI_SHAS = [
  '4de2f923f96942fa0f2612d857b11e8aa20bf42e5129e931e9ee834de16c25b0',
  '3adf82c24ce25120ee6a33f00becc1fbdbc1a7908a55e0b58c4312de7ed87ceb',
];
const FIXTURE_SHA = '0'.repeat(64);
const FOREIGN_NAME = 'Secreto Beta';
const FOREIGN_AMOUNT = '424200';
const FOREIGN_LIST = 'fixture-b-secret';

function assertNoForeignLeak(value: unknown): void {
  const text = JSON.stringify(value);
  for (const secret of [FOREIGN_NAME, FOREIGN_AMOUNT, FOREIGN_LIST, 'fix-b', 'pl-b', 'pe-b', ...VITRI_SHAS]) {
    assert.equal(text.includes(secret), false, secret);
  }
}

function fixtureProduct(organizationId: string, id: string, name: string): IsolatedProduct {
  return {
    id,
    organizationId,
    businessCode: null,
    name,
    category: 'sanitarios',
    description: null,
    aliases: [],
    attributeValues: ['gravedad'],
  };
}

function fixtureList(organizationId: string, id: string, version: string): PriceList {
  return {
    id,
    organizationId,
    version,
    currency: 'BOB',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    effectiveTo: null,
    source: {
      filename: 'isolation-fixture.txt',
      sha256: FIXTURE_SHA,
      page: null,
      printedContext: 'Showroom',
      excerpt: `fixture Showroom Bs. 1,01 ${version}`,
    },
  };
}

function twoOrganizations(): TenantCommercialCatalog {
  const catalog = new TenantCommercialCatalog();
  catalog.registerProduct(fixtureProduct('org-a', 'fix-a', 'Fijacion Alfa'));
  catalog.registerProduct(fixtureProduct('org-b', 'fix-b', FOREIGN_NAME));
  catalog.registerPriceList(fixtureList('org-a', 'pl-a', 'fixture-a'));
  catalog.registerPriceList(fixtureList('org-b', 'pl-b', FOREIGN_LIST));
  catalog.registerPriceEntry({
    id: 'pe-a',
    organizationId: 'org-a',
    priceListId: 'pl-a',
    productId: 'fix-a',
    context: 'Showroom',
    currency: 'BOB',
    amountCentavos: '101',
    source: fixtureList('org-a', 'pl-a', 'fixture-a').source,
  });
  catalog.registerPriceEntry({
    id: 'pe-b',
    organizationId: 'org-b',
    priceListId: 'pl-b',
    productId: 'fix-b',
    context: 'Showroom',
    currency: 'BOB',
    amountCentavos: FOREIGN_AMOUNT,
    source: {
      ...fixtureList('org-b', 'pl-b', FOREIGN_LIST).source,
      excerpt: 'fixture Showroom Bs. 4242,00 — not a Vitri price',
    },
  });
  return catalog;
}

describe('vitri price source', () => {
  it('creates no price entry and marks every unmatched source REVIEW_REQUIRED', () => {
    const preview = buildReviewedPreview();
    const review = reviewCatalogPrices(preview);
    assert.equal(MISSING_AUGUST_2026_PRICE_MATRIX.located, false);
    assert.equal(review.importExecuted, false);
    assert.equal(review.isPriceList, false);
    assert.equal(review.entries.length, 0);
    assert.equal(preview.products.length, 25);
    assert.equal(
      review.reviews.length,
      1 + preview.printedLabelsWithoutAmount.length + preview.products.length,
    );
    assert.equal(review.reviews.every((item) => item.status === 'REVIEW_REQUIRED'), true);
    assert.equal(review.reviews.some((item) => item.reason.includes('August 2026 price matrix')), true);
    for (const product of preview.products) {
      assert.equal(product.id, stableProductId(product.canonicalKey));
      assert.equal(product.businessCode, null);
      assert.equal(review.entries.some((entry) => entry.productId === product.id), false);
    }
    const serialized = JSON.stringify(review);
    assert.equal(serialized.includes('amountCentavos'), false);
    for (const sha of VITRI_SHAS) {
      assert.equal(review.entries.some((entry) => entry.source.sha256 === sha), false);
    }
  });

  it('does not add a price column to the product master', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const fragment = readFileSync(fragmentPath, 'utf8');
    assert.doesNotMatch(sql, /INSERT INTO/i);
    assert.doesNotMatch(sql, /ALTER TABLE os_catalog_products/i);
    assert.doesNotMatch(fragment, /model OsCatalogProduct/);
    assert.match(sql, /currency = 'BOB'/);
    assert.match(sql, /Más de 10 unidades/);
    for (const context of PRICE_CONTEXTS) {
      assert.equal(sql.includes(context), true, context);
    }
  });
});

describe('fixture organizations do not leak prices', () => {
  const advisor = { organizationId: 'org-a', grantedScopes: ['commercial.team.read'] };
  const adminOnly = { organizationId: 'org-a', grantedScopes: ['people.admin'] };
  const noSessionOrg = { organizationId: '', grantedScopes: ['master_data.admin'] };

  for (const resource of CATALOG_RESOURCES) {
    it(`keeps ${resource} inside the session organization`, () => {
      const catalog = twoOrganizations();
      const own = catalog.search(advisor, resource, resource === 'price_entry' ? 'Showroom' : 'Fijacion');
      if (resource === 'price_list') {
        const listed = catalog.search(advisor, resource, 'fixture-a');
        assert.equal(listed.ok, true);
        assertNoForeignLeak(listed);
      } else if (resource === 'product') {
        assert.equal(own.ok, true);
        if (own.ok) assert.equal(own.value.some((item) => item.label === 'Fijacion Alfa'), true);
        assertNoForeignLeak(own);
        const byAttribute = catalog.search(advisor, resource, 'gravedad');
        assertNoForeignLeak(byAttribute);
        const nullSku = catalog.readProduct(advisor, 'fix-a');
        assert.equal(nullSku.ok, true);
        if (nullSku.ok) assert.equal(nullSku.value?.businessCode, null);
      } else {
        assert.equal(own.ok, true);
        assertNoForeignLeak(own);
      }

      assert.equal(catalog.search(adminOnly, resource, FOREIGN_NAME).ok, false);
      assertNoForeignLeak(catalog.search(adminOnly, resource, FOREIGN_NAME));
      assert.equal(catalog.search(advisor, resource, FOREIGN_NAME, 'org-b').ok, false);
      assertNoForeignLeak(catalog.search(advisor, resource, FOREIGN_NAME, 'org-b'));
      assert.equal(catalog.suggest(noSessionOrg, resource, FOREIGN_AMOUNT, 'org-b').ok, false);
      assertNoForeignLeak(catalog.suggest(noSessionOrg, resource, FOREIGN_AMOUNT, 'org-b'));
      assertNoForeignLeak(catalog.suggest(advisor, resource, 'Secreto'));
      assertNoForeignLeak(catalog.recent(advisor, resource));
      assertNoForeignLeak(catalog.quickView(advisor, resource, 'fix-b'));
      const board = catalog.dashboard(advisor);
      assert.equal(board.ok, true);
      if (board.ok) {
        assert.equal(board.value.productCount, 1);
        assert.equal(board.value.priceEntryAmountCentavosTotal, '101');
      }
      assertNoForeignLeak(board);
      assertNoForeignLeak(catalog.dashboard(adminOnly));
      assertNoForeignLeak(catalog.dashboard(noSessionOrg, 'org-b'));
    });
  }

  it('does not show denied products in the catalog surface', () => {
    const products = [
      {
        id: 'fix-b',
        name: FOREIGN_NAME,
        category: 'sanitarios',
        description: null,
        businessCode: null,
        reviewStatus: 'named_only',
        attributeValues: [],
        aliases: [],
      },
    ];
    const denied = catalogSurface({ status: 'denied', products, query: '', category: null });
    assert.equal(denied.state, 'denied');
    assert.deepEqual(denied.items, []);
    assertNoForeignLeak(denied);
    const unmatched = catalogSurface({
      status: 'ready',
      products: [{ ...products[0], id: 'fix-a', name: 'Fijacion Alfa' }],
      query: 'no-existe',
      category: null,
    });
    assert.equal(unmatched.state, 'no-match');
    assert.equal(unmatched.items.length, 0);
  });
});
