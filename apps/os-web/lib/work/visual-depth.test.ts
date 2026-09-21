import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('visual color depth and inherited scanability', () => {
  it('shared depth CSS tints headers, chips, pagination, and selected tabs', () => {
    const css = read('styles/visual-depth.css');
    const layout = read('app/layout.tsx');
    assert.match(layout, /visual-depth\.css/);
    assert.match(css, /\.isalwa-section-band--teal/);
    assert.match(css, /\.isalwa-section-band--amber/);
    assert.match(css, /\.isalwa-operating-scan-header/);
    assert.match(css, /--isalwa-teal-100/);
    assert.match(css, /\[data-list-page-nav\] a/);
    assert.match(css, /\[data-section-tone='active'\]/);
    assert.match(css, /\.isalwa-chip\.is-active/);
    assert.match(css, /\[data-entrega-section-nav\] a\[aria-current='true'\]/);
    assert.doesNotMatch(css, /overflow-x:\s*scroll/);
  });

  it('status pills and attention surfaces use filled semantic tokens', () => {
    const pill = read('../../packages/ui/src/components/status-pill.tsx');
    const section = read('../../packages/ui/src/components/layout.tsx');
    const stats = read('../../packages/ui/src/components/data.tsx');
    assert.match(pill, /success: 'bg-\[var\(--isalwa-status-green-bg\)\]/);
    assert.match(pill, /warning: 'bg-\[var\(--isalwa-status-amber-bg\)\]/);
    assert.match(pill, /danger: 'bg-\[var\(--isalwa-status-red-bg\)\]/);
    assert.match(pill, /presentada: 'in_progress'/);
    assert.match(section, /--isalwa-status-amber-bg/);
    assert.match(stats, /StatGroupFill/);
    assert.match(stats, /fill \? STAT_FILL/);
  });

  it('Inicio, Excepciones, and counters use visible color surfaces', () => {
    const bands = read('components/inicio/inicio-visual-band.tsx');
    const cards = read('components/inicio/inicio-summary-cards.tsx');
    const queues = read('components/inicio/inicio-command-queue-sections.tsx');
    const lens = read('components/management/inicio-management-lens.tsx');
    const trabajo = read('app/(app)/trabajo/page.tsx');
    assert.match(bands, /bg-\[var\(--isalwa-teal-100\)\]/);
    assert.match(bands, /border-\[var\(--isalwa-status-amber-2\)\] bg-white/);
    assert.doesNotMatch(bands, /attention:[\s\S]*bg-\[var\(--isalwa-status-amber-bg\)\]/);
    assert.match(cards, /bg-\[var\(--isalwa-status-red-bg\)\]/);
    assert.match(queues, /pendientes: 'ops'/);
    assert.match(queues, /decisiones: 'ops'/);
    assert.match(queues, /data-section-tone=\{SECTION_ACCENT/);
    assert.match(queues, /bg-white/);
    assert.match(lens, /bg-\[var\(--isalwa-status-amber-bg\)\]/);
    assert.match(lens, /bg-\[var\(--isalwa-status-red-bg\)\]/);
    assert.match(trabajo, /fill: 'active'/);
    assert.match(trabajo, /fill: summary\.vencido > 0 \? 'danger'/);
  });

  it('scanability contract from 13f02b4 remains identity-first', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    const nav = read('components/lists/list-page-nav.tsx');
    const bound = read('lib/lists/page-window.ts');
    assert.match(scan, /isalwa-scan-row-identity/);
    assert.match(scan, /line-clamp-2/);
    assert.match(scan, /isalwa-scan-row-meta/);
    assert.match(scan, /md:sr-only/);
    assert.match(scan, /isalwa-scan-row-actions/);
    assert.match(scan, /md:border-l md:border-\[var\(--isalwa-mist\)\] md:pl-3/);
    assert.match(scan, /bg-\[var\(--isalwa-teal-100\)\]/);
    assert.match(nav, /data-list-page-nav/);
    assert.match(nav, /‹ Anterior/);
    assert.match(nav, /Siguiente ›/);
    assert.match(nav, /Página actual/);
    assert.doesNotMatch(nav, /de \{pageCount\}/);
    assert.match(bound, /LIST_PAGE_SIZE = 25/);
    assert.doesNotMatch(scan, /overflow-x-scroll|w-screen/);
  });

  it('commercial and ops collections keep isolated row actions', () => {
    const party = read('components/party/party-list.tsx');
    const opp = read('components/commercial/opportunity-org-list.tsx');
    const quotes = read('components/commercial/quote-org-list.tsx');
    const orders = read('components/commercial/order-org-list.tsx');
    const entregas = read('components/delivery/entrega-operational-write-desk.tsx');
    const catalog = read('components/catalog/catalog-browser.tsx');
    assert.match(party, /OperatingScanRow|isalwa-scan-row-identity|Ver Cliente 360/);
    assert.match(opp, /OperatingScanRow|Ver oportunidad/);
    assert.match(quotes, /OperatingScanRow|Ver cotización/);
    assert.match(orders, /OperatingScanRow|Ver pedido/);
    assert.match(entregas, /Abrir pedido/);
    assert.match(entregas, /bg-\[var\(--isalwa-teal-100\)\]/);
    assert.match(catalog, /Ver ficha/);
    assert.doesNotMatch(catalog, /underline-offset-2 hover:underline/);
  });
});
