import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { INICIO_SECTION_LIMIT } from '@/lib/commercial/inicio-home';

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(resolve(here, rel), 'utf8');
}

describe('Inicio quote summary layout (hosted regression)', () => {
  it('INICIO draft/sent panels use compact QuoteOrgList with Ver todas', () => {
    const page = read('../../app/(app)/inicio/page.tsx');
    assert.match(page, /pages\.inicio\.quotesDraft/);
    assert.match(page, /pages\.inicio\.quotesSubmitted/);
    assert.match(page, /destinationLink\('\/cotizaciones\?status=draft', 'Ver todas'\)/);
    assert.match(page, /destinationLink\('\/cotizaciones\?status=submitted', 'Ver todas'\)/);
    assert.match(page, /lg:grid-cols-2/);
    // Both summary panels must opt into compact (card-width) layout.
    const draftBlock = page.slice(
      page.indexOf('pages.inicio.quotesDraft'),
      page.indexOf('pages.inicio.quotesSubmitted'),
    );
    const sentBlock = page.slice(page.indexOf('pages.inicio.quotesSubmitted'));
    assert.match(draftBlock, /<QuoteOrgList[\s\S]*?\bcompact\b/);
    assert.match(sentBlock, /<QuoteOrgList[\s\S]*?\bcompact\b/);
  });

  it('compact mode is stacked summary — not a squeezed multi-column header table', () => {
    const list = read('../../components/commercial/quote-org-list.tsx');
    assert.match(list, /compact = false/);
    assert.match(list, /data-quote-list-layout="summary"/);
    assert.match(list, /data-quote-list-layout="desk"/);
    // Summary path must not render the operating-scan header / desktop grid.
    const summaryStart = list.indexOf('if (compact)');
    const deskStart = list.indexOf('data-quote-list-layout="desk"');
    assert.ok(summaryStart >= 0 && deskStart > summaryStart);
    const summary = list.slice(summaryStart, deskStart);
    assert.doesNotMatch(summary, /OperatingScanListHeader/);
    assert.doesNotMatch(summary, /DESKTOP_GRID/);
    assert.doesNotMatch(summary, /md:grid-cols-\[/);
    assert.match(summary, /Ver cotización/);
    assert.match(summary, /break-words/);
    assert.match(summary, /flex-wrap/);
  });

  it('full Cotizaciones desk keeps the scan table; Inicio stays bounded', () => {
    const cotizaciones = read('../../app/(app)/cotizaciones/page.tsx');
    const list = read('../../components/commercial/quote-org-list.tsx');
    // Desk page must not force compact on the full list.
    const deskUsage = cotizaciones.slice(cotizaciones.indexOf('<QuoteOrgList'));
    assert.doesNotMatch(deskUsage.slice(0, 400), /\bcompact\b/);
    assert.match(list, /OperatingScanListHeader/);
    assert.equal(INICIO_SECTION_LIMIT, 5);
  });

  it('QUOTE_NUMBER / CLIENT / STATUS / ACTION remain in summary rows', () => {
    const list = read('../../components/commercial/quote-org-list.tsx');
    const summary = list.slice(list.indexOf('if (compact)'), list.indexOf('data-quote-list-layout="desk"'));
    assert.match(summary, /item\.quoteNumber/);
    assert.match(summary, /partyLabel\(partyLabels, item\.partyId\)/);
    assert.match(summary, /formatQuoteStatus/);
    assert.match(summary, /StatusPill/);
    assert.match(summary, /Ver cotización/);
    assert.match(summary, /quoteHref\(item\.partyId, item\.quoteId\)/);
  });
});
