import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CATALOG_RESOURCES, resolveCatalogRead, type CatalogResource } from './product-catalog';
import {
  PRICE_CONTEXTS,
  PRICE_CURRENCY,
  PRICE_MATCH_REVIEW,
  PriceEntrySchema,
  TenantCommercialCatalog,
  governQuotedPrice,
  matchPriceObservation,
  type IsolatedProduct,
  type PriceList,
} from './price-list';

const VITRI_CATALOG_SHA = '4de2f923f96942fa0f2612d857b11e8aa20bf42e5129e931e9ee834de16c25b0';
const VITRI_SEASON_SHA = '3adf82c24ce25120ee6a33f00becc1fbdbc1a7908a55e0b58c4312de7ed87ceb';
const FIXTURE_SHA = '0'.repeat(64);

const FOREIGN_NAME = 'Secreto Beta';
const FOREIGN_LIST = 'fixture-b-secret';
const FOREIGN_AMOUNT = '424200';
const FOREIGN_PRODUCT_ID = 'fix-b';
const FOREIGN_LIST_ID = 'pl-b';
const FOREIGN_ENTRY_ID = 'pe-b';

const OWN_NAME = 'Fijacion Alfa';
const OWN_AMOUNT = '101';

function product(organizationId: string, id: string, name: string): IsolatedProduct {
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

function list(organizationId: string, id: string, version: string): PriceList {
  return {
    id,
    organizationId,
    version,
    currency: PRICE_CURRENCY,
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    effectiveTo: null,
    source: {
      filename: 'isolation-fixture.txt',
      sha256: FIXTURE_SHA,
      page: null,
      printedContext: 'Showroom',
      excerpt: 'fixture Showroom Bs. 1,01 — not a Vitri price',
    },
  };
}

function loaded(): TenantCommercialCatalog {
  const catalog = new TenantCommercialCatalog();
  catalog.registerProduct(product('org-a', 'fix-a', OWN_NAME));
  catalog.registerProduct(product('org-b', FOREIGN_PRODUCT_ID, FOREIGN_NAME));
  catalog.registerPriceList(list('org-a', 'pl-a', 'fixture-a'));
  catalog.registerPriceList(list('org-b', FOREIGN_LIST_ID, FOREIGN_LIST));
  catalog.registerPriceEntry({
    id: 'pe-a',
    organizationId: 'org-a',
    priceListId: 'pl-a',
    productId: 'fix-a',
    context: 'Showroom',
    currency: PRICE_CURRENCY,
    amountCentavos: OWN_AMOUNT,
    source: list('org-a', 'pl-a', 'fixture-a').source,
  });
  catalog.registerPriceEntry({
    id: FOREIGN_ENTRY_ID,
    organizationId: 'org-b',
    priceListId: FOREIGN_LIST_ID,
    productId: FOREIGN_PRODUCT_ID,
    context: 'Showroom',
    currency: PRICE_CURRENCY,
    amountCentavos: FOREIGN_AMOUNT,
    source: {
      ...list('org-b', FOREIGN_LIST_ID, FOREIGN_LIST).source,
      excerpt: 'fixture Showroom Bs. 4242,00 — not a Vitri price',
    },
  });
  return catalog;
}

const advisor = { organizationId: 'org-a', grantedScopes: ['commercial.org.read'] };
const clerk = { organizationId: 'org-a', grantedScopes: ['people.admin'] };
const noOrg = { organizationId: null, grantedScopes: ['commercial.org.read'] };

const SECRETS = [FOREIGN_NAME, FOREIGN_LIST, FOREIGN_AMOUNT, FOREIGN_PRODUCT_ID, FOREIGN_LIST_ID, FOREIGN_ENTRY_ID];

function assertNoForeignLeak(value: unknown): void {
  const text = JSON.stringify(value);
  for (const secret of SECRETS) {
    assert.equal(text.includes(secret), false, secret);
  }
  assert.equal(text.includes(VITRI_CATALOG_SHA), false);
  assert.equal(text.includes(VITRI_SEASON_SHA), false);
}

describe('price list contract', () => {
  it('keeps the four contexts, BOB, and refuses an entry without a source', () => {
    assert.deepEqual(PRICE_CONTEXTS, [
      'Showroom',
      'Más de 10 unidades',
      'Calidad Segunda',
      'Viajes',
    ]);
    assert.equal(PRICE_CURRENCY, 'BOB');
    assert.throws(() =>
      PriceEntrySchema.parse({
        id: 'pe',
        organizationId: 'org-a',
        priceListId: 'pl',
        productId: 'prd',
        context: 'Showroom',
        currency: 'BOB',
        amountCentavos: '100',
      }),
    );
  });

  it('does not create a price entry when the printed text has no amount and context', () => {
    const unmatched = matchPriceObservation(
      {
        sourceFilename: 'Vitri2026.2027.pdf',
        sourceSha256: VITRI_SEASON_SHA,
        page: 8,
        excerpt: 'Gama CromáticaPRICE',
        printedContext: null,
        amountCentavos: null,
        productId: 'prd_capri',
      },
      { id: 'pl', organizationId: 'org-a', currency: 'BOB' },
      'should-not-exist',
    );
    assert.equal(unmatched.entries.length, 0);
    assert.equal(unmatched.reviews.length, 1);
    assert.equal(unmatched.reviews[0]?.status, PRICE_MATCH_REVIEW);
    assert.equal(JSON.stringify(unmatched).includes('should-not-exist'), false);

    const amountWithoutContext = matchPriceObservation(
      {
        sourceFilename: 'notes.txt',
        sourceSha256: FIXTURE_SHA,
        page: 1,
        excerpt: 'Bs. 10,00',
        printedContext: null,
        amountCentavos: '1000',
        productId: 'prd_capri',
      },
      { id: 'pl', organizationId: 'org-a', currency: 'BOB' },
      'should-not-exist',
    );
    assert.equal(amountWithoutContext.entries.length, 0);
    assert.equal(amountWithoutContext.reviews[0]?.status, PRICE_MATCH_REVIEW);
  });

  it('keeps the quoted price distinct and does not invent a governed amount', () => {
    const missing = governQuotedPrice({ quotedCentavos: '500', governedCentavos: null });
    assert.equal(missing.quotedIsListPrice, false);
    assert.equal(missing.blocksQuote, false);
    assert.equal(missing.approval, 'not_applicable');
    assert.equal(missing.governedCentavos, null);

    const below = governQuotedPrice({ quotedCentavos: '400', governedCentavos: '500' });
    assert.equal(below.approval, 'pending');
    assert.equal(below.quotedIsListPrice, false);
    assert.equal(below.blocksQuote, false);
    assert.equal(below.governedCentavos, '500');

    const at = governQuotedPrice({ quotedCentavos: '500', governedCentavos: '500' });
    assert.equal(at.approval, 'not_required');
  });
});

describe('tenant isolation for product, price list, and price entry', () => {
  for (const resource of CATALOG_RESOURCES) {
    describe(resource, () => {
      it('allows the same tenant with a catalog read scope', () => {
        const catalog = loaded();
        const found = read(catalog, resource, advisor);
        assert.equal(found.ok, true);
        if (!found.ok || !found.value) return;
        assert.equal(found.organizationId, 'org-a');
        assertNoForeignLeak(found);
      });

      it('denies the same tenant when the role cannot read the catalog', () => {
        const catalog = loaded();
        const found = read(catalog, resource, clerk);
        assert.equal(found.ok, false);
        if (found.ok) return;
        assert.equal(found.denial, 'role_denied');
        assertNoForeignLeak(found);
        assert.equal('value' in found, false);
      });

      it('denies a cross-tenant request', () => {
        const catalog = loaded();
        const found = read(catalog, resource, advisor, 'org-b');
        assert.equal(found.ok, false);
        if (found.ok) return;
        assert.equal(found.denial, 'cross_tenant_denied');
        assertNoForeignLeak(found);
      });

      it('denies a direct call without a session organization', () => {
        const catalog = loaded();
        const found = read(catalog, resource, noOrg, 'org-b');
        assert.equal(found.ok, false);
        if (found.ok) return;
        assert.equal(found.denial, 'session_organization_required');
        assertNoForeignLeak(found);
        const unscoped = resolveCatalogRead(null, 'org-b');
        assert.equal(unscoped.allowed, false);
        if (unscoped.allowed) return;
        assert.equal(unscoped.denial, 'session_organization_required');
      });

      it('does not leak another tenant through search or autocomplete', () => {
        const catalog = loaded();
        for (const text of [FOREIGN_NAME, FOREIGN_LIST, FOREIGN_AMOUNT, 'Secreto', '4242']) {
          const searched = catalog.search(advisor, resource, text);
          const suggested = catalog.suggest(advisor, resource, text);
          assert.equal(searched.ok, true);
          assert.equal(suggested.ok, true);
          assertNoForeignLeak(searched);
          assertNoForeignLeak(suggested);
        }
        const deniedSearch = catalog.search(clerk, resource, FOREIGN_NAME);
        const deniedSuggest = catalog.suggest(noOrg, resource, FOREIGN_AMOUNT, 'org-b');
        assert.equal(deniedSearch.ok, false);
        assert.equal(deniedSuggest.ok, false);
        assertNoForeignLeak(deniedSearch);
        assertNoForeignLeak(deniedSuggest);
      });

      it('does not leak another tenant through dashboard, quick view, or recent', () => {
        const catalog = loaded();
        const board = catalog.dashboard(advisor);
        assert.equal(board.ok, true);
        if (!board.ok) return;
        assert.equal(board.value.productCount, 1);
        assert.equal(board.value.priceListCount, 1);
        assert.equal(board.value.priceEntryCount, 1);
        assert.equal(board.value.priceEntryAmountCentavosTotal, OWN_AMOUNT);
        assertNoForeignLeak(board);

        const foreignId =
          resource === 'product' ? FOREIGN_PRODUCT_ID : resource === 'price_list' ? FOREIGN_LIST_ID : FOREIGN_ENTRY_ID;
        const view = catalog.quickView(advisor, resource, foreignId);
        const recent = catalog.recent(advisor, resource);
        const deniedBoard = catalog.dashboard(clerk, 'org-a');
        const crossBoard = catalog.dashboard(advisor, 'org-b');
        const nakedBoard = catalog.dashboard(noOrg, 'org-b');
        assert.equal(view.ok, true);
        if (view.ok) assert.equal(view.value, null);
        assertNoForeignLeak(view);
        assertNoForeignLeak(recent);
        assert.equal(deniedBoard.ok, false);
        assert.equal(crossBoard.ok, false);
        assert.equal(nakedBoard.ok, false);
        assertNoForeignLeak(deniedBoard);
        assertNoForeignLeak(crossBoard);
        assertNoForeignLeak(nakedBoard);
        assert.equal(JSON.stringify(deniedBoard).includes('count'), false);
      });
    });
  }
});

function read(
  catalog: TenantCommercialCatalog,
  resource: CatalogResource,
  session: { organizationId: string | null; grantedScopes: string[] },
  requestedOrganizationId?: string,
) {
  if (resource === 'product') return catalog.readProduct(session, 'fix-a', requestedOrganizationId);
  if (resource === 'price_list') return catalog.readPriceList(session, 'pl-a', requestedOrganizationId);
  return catalog.readPriceEntry(session, 'pe-a', requestedOrganizationId);
}
