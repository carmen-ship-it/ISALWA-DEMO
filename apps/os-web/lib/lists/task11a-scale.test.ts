import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  LIST_PAGE_SIZE,
  boundedPageHrefs,
  parsePageNumber,
  sliceListPage,
} from '@/lib/lists/page-window';
import { cursorPageLinks, listHref, parseListQuery } from '@/lib/lists/url-state';
import { presentListScale, LIST_SCALE_PREVIEW_LARGE } from '@/lib/ui/list-scaling';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function synthParties(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    partyId: `party-${i + 1}`,
    displayName: i === 0
      ? 'DEMO CONSTRUCTORA ANDINA CON NOMBRE COMERCIAL MUY LARGO PARA ESCALA'
      : `Cliente sintético ${i + 1}`,
    status: i % 2 === 0 ? 'active' : 'inactive',
  }));
}

describe('Task 11A — all-pages scale foundation (commercial)', () => {
  it('DEFAULT_SIZE is 25 and 100 synthetic records paginate with Anterior/Siguiente', () => {
    assert.equal(LIST_PAGE_SIZE, 25);
    const items = synthParties(100);
    const page1 = sliceListPage(items, 1);
    assert.equal(page1.items.length, 25);
    assert.equal(page1.page, 1);
    assert.equal(page1.pageCount, 4);
    assert.equal(page1.showChrome, true);
    const page2 = sliceListPage(items, 2);
    assert.equal(page2.items[0]?.partyId, 'party-26');
    const page4 = sliceListPage(items, 4);
    assert.equal(page4.items.length, 25);
    const hrefs = boundedPageHrefs('/clientes', { q: 'construc', status: 'active' }, 2, 4);
    assert.match(hrefs.prevHref ?? '', /pagina=1|q=construc/);
    assert.match(hrefs.nextHref ?? '', /pagina=3/);
    assert.match(hrefs.nextHref ?? '', /q=construc/);
    assert.match(hrefs.nextHref ?? '', /status=active/);
  });

  it('cursor nav never invents exact totals', () => {
    const links = cursorPageLinks(
      '/oportunidades',
      { q: 'demo', status: 'open', cursor: 'c1', trail: JSON.stringify(['']) },
      'c2',
      true,
    );
    assert.ok(links.nextHref);
    assert.ok(links.prevHref);
    const nav = read('components/lists/list-page-nav.tsx');
    assert.match(nav, /total=null|total != null/);
    assert.match(nav, /Página actual/);
  });

  it('search/filter URL state resets cursor via omit helpers', () => {
    const state = parseListQuery({ q: 'acme', status: 'open', cursor: 'abc', pagina: '3' });
    assert.equal(parsePageNumber(state.pagina), 3);
    const cleared = listHref('/clientes', { ...state, cursor: undefined, pagina: undefined }, ['cursor']);
    assert.doesNotMatch(cleared, /cursor=/);
    assert.match(cleared, /q=acme/);
  });

  it('empty vs zero-match vs loading helpers stay distinct in Clientes', () => {
    const page = read('app/(app)/clientes/page.tsx');
    assert.match(page, /PartyEmptySearch/);
    assert.match(page, /QuerySurfaceState/);
    assert.match(page, /hasSearchCriteria/);
    assert.match(page, /PartySearchForm/);
    assert.match(page, /limit: 25/);
    assert.match(page, /cursorPageLinks/);
    const list = read('components/party/party-list.tsx');
    assert.match(list, /OperatingScanRow/);
    assert.match(list, /Ver Cliente 360/);
    assert.match(list, /Ver Cliente 360/);
  });

  it('commercial desks keep search, status, cursor nav, Ver actions', () => {
    for (const [file, action] of [
      ['components/commercial/opportunity-org-list.tsx', 'Ver oportunidad'],
      ['components/commercial/quote-org-list.tsx', 'Ver cotización'],
      ['components/commercial/order-org-list.tsx', 'Ver pedido'],
    ] as const) {
      const src = read(file);
      assert.match(src, /OperatingScanRow/);
      assert.match(src, new RegExp(action));
    }
    for (const page of ['oportunidades', 'cotizaciones', 'pedidos'] as const) {
      const src = read(`app/(app)/${page}/page.tsx`);
      assert.match(src, /ListSearchForm|PartySearchForm|ListPageNav|cursorPageLinks/);
      assert.match(src, /limit: LIST_LIMIT|LIST_LIMIT/);
      assert.doesNotMatch(src, /dataMode === 'demo' \? 100/);
      assert.match(src, /total=\{null\}/);
    }
  });

  it('Inicio summaries stay bounded with Ver todas — no card pagination', () => {
    const inicio = read('app/(app)/inicio/page.tsx');
    assert.match(inicio, /INICIO_SECTION_LIMIT/);
    assert.match(inicio, /Ver todas/);
    assert.doesNotMatch(inicio, /ListPageNav/);
    const home = read('lib/commercial/inicio-home.ts');
    assert.match(home, /INICIO_SECTION_LIMIT/);
  });

  it('Cliente360 historial/docs/locations/comercial do not expand-all unbounded', () => {
    const hist = read('components/cliente/cliente-360-historial.tsx');
    assert.match(hist, /moreHref=\{auditHref\}/);
    assert.match(hist, /Ver historial en Auditoría/);
    assert.doesNotMatch(hist, /full=\{<PartyTimelineList items=\{items\}/);

    const docs = read('components/cliente/cliente-360-documentos.tsx');
    assert.match(docs, /slice\(0, 10\)/);

    const loc = read('components/party/customer-location-panel.tsx');
    assert.match(loc, /LOCATION_PREVIEW_LIMIT/);

    const c360 = read('app/(app)/clientes/[partyId]/page.tsx');
    assert.match(c360, /moreHref="\/oportunidades"/);
    assert.match(c360, /moreHref="\/cotizaciones"/);
    assert.match(c360, /moreHref="\/pedidos"/);
    assert.match(c360, /allowExpand=\{false\}/);
  });

  it('ScaledListReveal moreHref avoids dumping full bound', () => {
    const reveal = read('components/ui/scaled-list-reveal.tsx');
    assert.match(reveal, /moreHref/);
    assert.match(reveal, /allowExpand/);
    const presentation = presentListScale(100, LIST_SCALE_PREVIEW_LARGE);
    assert.equal(presentation.mode, 'scaled');
    assert.equal(presentation.visibleCount, LIST_SCALE_PREVIEW_LARGE);
  });

  it('nested approval history on quote/pedido is capped', () => {
    const panel = read('components/commercial/commercial-approval-panel.tsx');
    assert.match(panel, /approvals\.slice\(0, 8\)/);
  });

  it('long identity stays recoverable on OperatingScanRow', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    assert.match(scan, /title=\{typeof title === 'string'/);
    assert.match(scan, /break-words/);
  });

  it('mobile contract: scan rows stack fields before md grid', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    assert.match(scan, /flex flex-col[\s\S]*md:grid/);
    assert.match(scan, /hideOnMobile/);
  });
});
