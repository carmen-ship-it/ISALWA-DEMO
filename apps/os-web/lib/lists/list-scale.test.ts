import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIST_PAGE_SIZE } from '@/lib/lists/page-window';
import { listHref, parseListQuery } from '@/lib/lists/url-state';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Task 4 lists actions scale', () => {
  it('DEFAULT_PAGE_SIZE is 25 and URL helpers preserve filters', () => {
    assert.equal(LIST_PAGE_SIZE, 25);
    const state = parseListQuery({ q: 'acme', status: 'open', density: 'comfortable' });
    const next = listHref('/oportunidades', { ...state, cursor: 'abc' });
    assert.match(next, /q=acme/);
    assert.match(next, /status=open/);
    assert.match(next, /density=comfortable/);
    assert.match(next, /cursor=abc/);
    const cleared = listHref('/oportunidades', state, ['q', 'cursor']);
    assert.doesNotMatch(cleared, /q=/);
    assert.doesNotMatch(cleared, /cursor=/);
  });

  it('shared OperatingScanRow exposes an obvious Abrir-style CTA', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    assert.match(scan, /actionLabel = 'Abrir'/);
    assert.match(scan, /actionLinkClass/);
    assert.match(scan, /secondaryActions/);
  });

  it('major commercial/work lists use scan rows with explicit CTAs', () => {
    const opportunities = read('components/commercial/opportunity-org-list.tsx');
    const quotes = read('components/commercial/quote-org-list.tsx');
    const orders = read('components/commercial/order-org-list.tsx');
    const work = read('components/work/work-list.tsx');

    assert.match(opportunities, /OperatingScanRow/);
    assert.match(opportunities, /Ver oportunidad/);
    assert.match(quotes, /OperatingScanRow/);
    assert.match(quotes, /Ver cotización/);
    assert.match(orders, /OperatingScanRow/);
    assert.match(orders, /Ver pedido/);
    assert.match(work, /OperatingScanRow/);
    assert.match(work, /Ver trabajo/);
  });

  it('approvals keep permission-aware CTAs and URL search state', () => {
    const panel = read('components/work/approval-desk-panel.tsx');
    assert.match(panel, /approvalListActionLabel/);
    assert.match(panel, /listState/);
    assert.match(panel, /ListSearchForm/);
    assert.match(panel, /Limpiar búsqueda y filtros/);
    assert.match(panel, /listHref\('\/aprobaciones'/);
  });

  it('ops desks keep status separate from Ver revisión / Ver solicitud', () => {
    const production = read('components/production/production-ops-table.tsx');
    const almacen = read('app/(app)/almacen/page.tsx');
    const compras = read('app/(app)/compras/page.tsx');

    assert.match(production, /Ver revisión/);
    assert.match(production, /Ver solicitud/);
    assert.match(production, /Ver pedido/);
    assert.match(production, /Revisión de producción/);
    assert.doesNotMatch(production, />\s*Trabajo\s*</);

    assert.match(almacen, /Ver revisión/);
    assert.match(almacen, /Ver pedido/);
    assert.match(almacen, /Revisión de almacén/);

    assert.match(compras, /Ver revisión/);
    assert.match(compras, /Ver pedido/);
    assert.match(compras, /Revisión de abastecimiento/);
  });

  it('zero-result empty states offer Limpiar búsqueda', () => {
    const opportunities = read('app/(app)/oportunidades/page.tsx');
    const quotes = read('app/(app)/cotizaciones/page.tsx');
    const orders = read('app/(app)/pedidos/page.tsx');
    const work = read('app/(app)/trabajo/page.tsx');

    assert.match(opportunities, /Limpiar búsqueda/);
    assert.match(quotes, /Limpiar búsqueda/);
    assert.match(orders, /Limpiar búsqueda/);
    assert.match(work, /Limpiar búsqueda y filtros/);
  });

  it('ENDLESS_LOAD_MORE is not the primary scale UX on major lists', () => {
    for (const rel of [
      'app/(app)/oportunidades/page.tsx',
      'app/(app)/cotizaciones/page.tsx',
      'app/(app)/pedidos/page.tsx',
      'app/(app)/trabajo/page.tsx',
      'app/(app)/aprobaciones/page.tsx',
    ]) {
      const source = read(rel);
      assert.match(source, /ListPageNav/);
      assert.doesNotMatch(source, /Cargar más/);
    }
  });
});
