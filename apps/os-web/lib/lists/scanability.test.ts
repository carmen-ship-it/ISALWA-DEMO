import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('table / list scanability', () => {
  it('scan identity is stronger than metadata and action is isolated', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    assert.match(scan, /isalwa-scan-row-identity/);
    assert.match(scan, /text-\[0\.9375rem\] font-semibold/);
    assert.match(scan, /line-clamp-2/);
    assert.match(scan, /isalwa-scan-row-meta/);
    assert.match(scan, /text-\[var\(--isalwa-slate\)\]/);
    assert.match(scan, /md:sr-only/);
    assert.match(scan, /isalwa-scan-row-status/);
    assert.match(scan, /isalwa-scan-row-actions/);
    assert.match(scan, /md:border-l md:border-\[var\(--isalwa-mist\)\] md:pl-3/);
    assert.doesNotMatch(scan, /md:truncate/);
    assert.match(scan, /overflow-x|hidden md:block|flex-col/);
    assert.doesNotMatch(scan, /overflow-x-scroll|w-screen/);
  });

  it('header stays quiet and pagination footer stays separated', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    const nav = read('components/lists/list-page-nav.tsx');
    assert.match(scan, /isalwa-operating-scan-header/);
    assert.match(scan, /uppercase/);
    assert.match(nav, /data-list-page-nav/);
    assert.match(nav, /border-t/);
    assert.match(nav, /‹ Anterior/);
    assert.match(nav, /Siguiente ›/);
    assert.match(nav, /Página actual/);
    assert.doesNotMatch(nav, /de \{pageCount\}/);
  });

  it('Task 11 page bound and ListPageNav remain on main desks', () => {
    const files = [
      'app/(app)/trabajo/page.tsx',
      'app/(app)/clientes/page.tsx',
      'app/(app)/oportunidades/page.tsx',
      'app/(app)/cotizaciones/page.tsx',
      'app/(app)/pedidos/page.tsx',
      'app/(app)/incidencias/page.tsx',
      'app/(app)/compromisos/page.tsx',
    ];
    for (const file of files) {
      const src = read(file);
      assert.match(src, /ListPageNav/, file);
    }
    const bound = read('lib/lists/page-window.ts');
    assert.match(bound, /LIST_PAGE_SIZE = 25/);
  });

  it('empty zero loading error remain distinct on production queue', () => {
    const table = read('components/production/production-ops-table.tsx');
    assert.match(table, /trueEmpty/);
    assert.match(table, /zeroMatch/);
    assert.match(table, /EmptyState/);
  });

  it('specialized collections keep compact identity/action split', () => {
    const approvals = read('components/work/approval-desk-panel.tsx');
    const commitments = read('components/commitments/commitment-list.tsx');
    const entregas = read('components/delivery/entrega-operational-write-desk.tsx');
    const salud = read('app/(app)/salud-datos/page.tsx');
    assert.match(approvals, /line-clamp-2 text-\[0\.9375rem\] font-semibold/);
    assert.match(commitments, /line-clamp-2 text-\[0\.9375rem\] font-semibold/);
    assert.match(entregas, /Abrir pedido/);
    assert.match(entregas, /md:border-l/);
    assert.match(salud, /px-3 py-2.5/);
    assert.doesNotMatch(salud, /md:p-5/);
  });
});
