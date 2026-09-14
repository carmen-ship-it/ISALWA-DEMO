import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { QUOTE_STATUSES } from '@isalwa/os-contracts';
import {
  CATALOG_LINK_CAPTION,
  PRICE_SOURCE_MISSING,
  QUOTED_PRICE_HINT,
  QUOTED_PRICE_LABEL,
  QUOTED_PRICE_READ_LABEL,
  SPECIAL_ITEM_LABEL,
  emptyProductSearchPort,
  isCatalogProductRef,
  isOffCatalogProductRef,
  lineProvenanceView,
  publicCatalogHit,
  quoteLinesAreEditable,
  quotedPriceEntry,
  resolveAddQuoteLineDraft,
  searchCatalog,
  snapshotCatalogSelection,
  type CatalogProductHit,
  type ProductSearchPort,
} from '@/lib/commercial/product-picker';

const editor = readFileSync(resolve('components/commercial/quote-editor.tsx'), 'utf8');
const picker = readFileSync(resolve('components/commercial/quote-product-picker.tsx'), 'utf8');
const actions = readFileSync(resolve('lib/commercial/actions.ts'), 'utf8');
const quotePage = readFileSync(
  resolve('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
  'utf8',
);

const FORBIDDEN_PRICE_LABEL = /precio de lista|list price|precio lista/i;

function catalogHit(overrides: Partial<CatalogProductHit> = {}): CatalogProductHit {
  return {
    productId: 'prod_capri',
    name: 'Capri',
    description: 'Inodoro de tanque',
    category: 'Sanitarios',
    active: true,
    ...overrides,
  };
}

describe('quote product picker', () => {
  it('records that the price source is missing and never suggests an amount', () => {
    assert.equal(PRICE_SOURCE_MISSING, true);
    const entry = quotedPriceEntry('99900');
    assert.equal(entry.suggestedCentavos, null);
    assert.equal(entry.label, QUOTED_PRICE_LABEL);
    assert.equal(entry.hint, QUOTED_PRICE_HINT);
    assert.doesNotMatch(entry.label, FORBIDDEN_PRICE_LABEL);
    assert.doesNotMatch(entry.hint, FORBIDDEN_PRICE_LABEL);
    assert.doesNotMatch(QUOTED_PRICE_READ_LABEL, FORBIDDEN_PRICE_LABEL);
  });

  it('stays empty until Product Master is integrated', async () => {
    assert.equal(emptyProductSearchPort.catalogAvailable, false);
    const hits = await searchCatalog(emptyProductSearchPort, {
      organizationId: 'org-1',
      text: 'Capri',
    });
    assert.deepEqual(hits, []);
    const unlabeled = await emptyProductSearchPort.search({
      organizationId: 'org-1',
      text: 'Capri',
    });
    assert.deepEqual(unlabeled, []);
  });

  it('does not search without a tenant or a usable name', async () => {
    let calls = 0;
    const port: ProductSearchPort = {
      catalogAvailable: true,
      async search() {
        calls += 1;
        return [catalogHit()];
      },
    };
    assert.deepEqual(await searchCatalog(port, { organizationId: '', text: 'Capri' }), []);
    assert.deepEqual(await searchCatalog(port, { organizationId: 'org-1', text: 'C' }), []);
    assert.equal(calls, 0);
  });

  it('forwards the organization and drops prices and inactive products', async () => {
    const port: ProductSearchPort = {
      catalogAvailable: true,
      async search(query) {
        assert.equal(query.organizationId, 'org-1');
        return [
          catalogHit(),
          catalogHit({ productId: 'prod_inactive', name: 'Cadiz', active: false }),
          {
            ...catalogHit({ productId: 'prod_priced', name: 'Verso' }),
            unitPriceCentavos: '150000',
            listPrice: '1500',
          } as CatalogProductHit,
        ];
      },
    };
    const hits = await searchCatalog(port, { organizationId: 'org-1', text: 'sanitario' });
    assert.deepEqual(
      hits.map((hit) => hit.productId),
      ['prod_capri', 'prod_priced'],
    );
    for (const hit of hits) {
      assert.equal('unitPriceCentavos' in hit, false);
      assert.equal('listPrice' in hit, false);
      assert.deepEqual(Object.keys(hit).sort(), [
        'active',
        'category',
        'description',
        'name',
        'productId',
      ]);
    }
    const stripped = publicCatalogHit({
      ...catalogHit(),
      unitPriceCentavos: '1',
    } as CatalogProductHit);
    assert.equal('unitPriceCentavos' in stripped, false);
  });

  it('stores the product id and snapshots name and description', () => {
    const hit = catalogHit();
    const draft = snapshotCatalogSelection(hit);
    hit.name = 'Capri editado';
    hit.description = 'Texto nuevo del catálogo';
    assert.equal(draft.kind, 'catalog');
    assert.equal(draft.productRef, 'prod_capri');
    assert.equal(isCatalogProductRef(draft.productRef), true);
    assert.equal(draft.descriptionSnapshot, 'Capri\nInodoro de tanque');
    assert.equal(draft.name, 'Capri');
    assert.equal(draft.detail, 'Inodoro de tanque');
    assert.equal('suggestedCentavos' in draft, false);
    assert.equal('unitPriceCentavos' in draft, false);
  });

  it('keeps an advisor edit of the snapshot without looking up the catalog again', () => {
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'catalog',
      productId: 'prod_capri',
      itemName: 'Capri para este cliente',
      itemDetail: 'Inodoro de tanque, color a confirmar',
      provenanceNote: '',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.draft.productRef, 'prod_capri');
    assert.equal(
      resolved.draft.descriptionSnapshot,
      'Capri para este cliente\nInodoro de tanque, color a confirmar',
    );
  });

  it('rejects a catalog line that was not selected', () => {
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'catalog',
      productId: '',
      itemName: 'Capri',
      itemDetail: '',
      provenanceNote: '',
    });
    assert.equal(resolved.ok, false);
    if (resolved.ok) return;
    assert.match(resolved.error, /producto/i);
  });

  it('records an off-catalog item with provenance and no product id', () => {
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'special',
      productId: 'should-not-stick',
      itemName: 'Pedestal a medida',
      itemDetail: 'Sin modelo de catálogo',
      provenanceNote: 'Pedido del cliente',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.draft.kind, 'special');
    assert.equal(isCatalogProductRef(resolved.draft.productRef), false);
    assert.equal(isOffCatalogProductRef(resolved.draft.productRef), true);
    assert.equal(resolved.draft.productRef.includes('should-not-stick'), false);
    assert.equal(resolved.draft.descriptionSnapshot, 'Pedestal a medida\nSin modelo de catálogo');
    assert.equal(resolved.draft.provenanceNote, 'Pedido del cliente');

    const view = lineProvenanceView(resolved.draft.productRef);
    assert.equal(view.kind, 'special');
    assert.equal(view.caption, SPECIAL_ITEM_LABEL);
    assert.equal(view.note, 'Pedido del cliente');
    assert.equal(view.priceLabel, QUOTED_PRICE_READ_LABEL);
    assert.doesNotMatch(view.caption ?? '', FORBIDDEN_PRICE_LABEL);
  });

  it('keeps a special item labeled even without a note', () => {
    const resolved = resolveAddQuoteLineDraft({
      lineKind: 'special',
      productId: '',
      itemName: 'Pieza suelta',
      itemDetail: '',
      provenanceNote: '   ',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    const view = lineProvenanceView(resolved.draft.productRef);
    assert.equal(view.kind, 'special');
    assert.equal(view.caption, SPECIAL_ITEM_LABEL);
    assert.equal(view.note, null);
    assert.equal(resolved.draft.descriptionSnapshot, 'Pieza suelta');
  });

  it('does not relabel an old free-text line as a special item', () => {
    const view = lineProvenanceView(null);
    assert.equal(view.kind, 'unlinked');
    assert.equal(view.caption, null);
    assert.equal(view.priceLabel, QUOTED_PRICE_READ_LABEL);
  });

  it('describes a stored catalog binding without a price', () => {
    const view = lineProvenanceView('prod_capri');
    assert.equal(view.kind, 'catalog');
    assert.equal(view.caption, CATALOG_LINK_CAPTION);
    assert.equal(view.note, null);
    assert.doesNotMatch(view.caption, FORBIDDEN_PRICE_LABEL);
  });

  it('leaves a submitted quote immutable in the editor', () => {
    assert.equal(quoteLinesAreEditable('draft'), true);
    for (const status of QUOTE_STATUSES) {
      if (status === 'draft') continue;
      assert.equal(quoteLinesAreEditable(status), false, status);
    }
    assert.match(editor, /quoteLinesAreEditable\(quote\.status\)/);
    assert.match(editor, /submitQuoteAction/);
    assert.match(editor, /Enviar cotización/);
    assert.doesNotMatch(editor, /RegisterFollowUpForm|createFollowUpAction/);
  });

  it('does not label the quoted price as a list price in the editor', () => {
    assert.match(editor, /QUOTED_PRICE_LABEL/);
    assert.match(editor, /emptyProductSearchPort/);
    assert.match(picker, /QUOTED_PRICE_LABEL/);
    assert.match(picker, /SPECIAL_ITEM_LABEL/);
    assert.match(picker, /emptyProductSearchPort/);
    assert.match(actions, /resolveAddQuoteLineDraft/);
    assert.match(actions, /productRef: draft\.draft\.productRef/);
    assert.match(quotePage, /lineProvenanceView/);
    assert.doesNotMatch([editor, picker, actions, quotePage].join('\n'), FORBIDDEN_PRICE_LABEL);
    assert.doesNotMatch(picker, /unitPriceCentavos|listPrice|precioLista/);
  });
});
