import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  LIST_PAGE_SIZE,
  boundHistoryItems,
  matchesOpsSearch,
  opsBoundedPageHrefs,
  windowFilteredOpsCollection,
} from '@/lib/lists/ops-collection';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function synthOps(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    orderId: `ord-${i + 1}`,
    orderLabel:
      i === 0
        ? 'PEDIDO DEMO CONSTRUCTORA ANDINA NOMBRE COMERCIAL EXTENDIDO PARA ESCALA 390PX'
        : `Pedido sintético ${i + 1}`,
    customerLabel:
      i === 0
        ? 'Cliente con razón social extremadamente larga para prueba móvil'
        : `Cliente sintético ${i + 1}`,
    productLabel: `Producto línea ${i + 1}`,
  }));
}

describe('Task 11C — operations scale foundation', () => {
  it('LIST_PAGE_SIZE stays 25; fixtures 0/1/25/26/100+ paginate', () => {
    assert.equal(LIST_PAGE_SIZE, 25);
    for (const count of [0, 1, 25, 26, 100, 101]) {
      const items = synthOps(count);
      const page1 = windowFilteredOpsCollection(items, {
        pagina: '1',
        match: () => true,
      });
      assert.equal(page1.matchedTotal, count);
      assert.equal(page1.items.length, Math.min(count, 25));
      if (count === 0) {
        assert.equal(page1.trueEmpty, true);
        assert.equal(page1.showChrome, false);
      }
      if (count === 26) {
        assert.equal(page1.showChrome, true);
        assert.equal(page1.pageCount, 2);
        const page2 = windowFilteredOpsCollection(items, { pagina: '2', match: () => true });
        assert.equal(page2.items.length, 1);
        assert.equal(page2.items[0]?.orderId, 'ord-26');
      }
      if (count >= 100) {
        assert.equal(page1.pageCount, Math.ceil(count / 25));
        const hrefs = opsBoundedPageHrefs(
          '/produccion',
          { q: 'andina' },
          2,
          page1.pageCount,
          { orderId: 'ord-1', datos: 'demo' },
        );
        assert.match(hrefs.prevHref ?? '', /pagina=1|q=andina/);
        assert.match(hrefs.nextHref ?? '', /pagina=3/);
        assert.match(hrefs.nextHref ?? '', /orderId=ord-1/);
        assert.match(hrefs.nextHref ?? '', /datos=demo/);
      }
    }
  });

  it('search distinguishes zero-match from true empty; long names match', () => {
    const empty = windowFilteredOpsCollection([], {
      q: 'nada',
      match: (row, q) => matchesOpsSearch(q, [row.orderLabel, row.customerLabel]),
    });
    assert.equal(empty.trueEmpty, false);
    assert.equal(empty.zeroMatch, true);

    const items = synthOps(100);
    const hit = windowFilteredOpsCollection(items, {
      q: 'ANDINA',
      match: (row, q) => matchesOpsSearch(q, [row.orderLabel, row.customerLabel]),
    });
    assert.equal(hit.matchedTotal, 1);
    assert.equal(hit.zeroMatch, false);
    assert.match(hit.items[0]?.orderLabel ?? '', /ANDINA/);

    const miss = windowFilteredOpsCollection(items, {
      q: 'zzzz-no-match',
      match: (row, q) => matchesOpsSearch(q, [row.orderLabel, row.customerLabel]),
    });
    assert.equal(miss.zeroMatch, true);
    assert.equal(miss.items.length, 0);
  });

  it('histories/pickers bound at 25 without inventing totals', () => {
    const bound = boundHistoryItems(synthOps(100), 25);
    assert.equal(bound.shown, 25);
    assert.equal(bound.loaded, 100);
    assert.equal(bound.truncated, true);
    assert.equal(bound.items.length, 25);
    const small = boundHistoryItems(synthOps(3), 25);
    assert.equal(small.truncated, false);
    assert.equal(small.shown, 3);
  });

  it('PRODUCTION_100_RECORD_SAFE — page uses window + ListPageNav + search', () => {
    const page = read('app/(app)/produccion/page.tsx');
    assert.match(page, /windowFilteredOpsCollection/);
    assert.match(page, /ListPageNav/);
    assert.match(page, /opsBoundedPageHrefs/);
    assert.match(page, /Buscar Pedido o cliente/);
    assert.match(page, /orderId/);
    const desk = read('components/production/production-postsale-desk.tsx');
    assert.match(desk, /attemptKeyRef/);
    assert.doesNotMatch(desk, /idempotencyKey:\s*null/);
  });

  it('WAREHOUSE_100_RECORD_SAFE + WAREHOUSE_HISTORY_BOUNDED structural markers', () => {
    const page = read('app/(app)/almacen/page.tsx');
    const desk = read('components/warehouse/warehouse-desk.tsx');
    assert.match(page, /windowFilteredOpsCollection/);
    assert.match(page, /ListPageNav/);
    assert.match(desk, /boundHistoryItems/);
  });

  it('PURCHASING_100_RECORD_SAFE structural markers', () => {
    const page = read('app/(app)/compras/page.tsx');
    const panel = read('components/purchasing/purchase-request-panel.tsx');
    const src = page + panel;
    assert.match(src, /windowFilteredOpsCollection|ListPageNav|sliceListPage/);
    assert.match(src, /pagina/);
    assert.doesNotMatch(src, /Crear OC|Nueva OC|Autor(izar|ía) OC|emitir OC/i);
    assert.match(src, /Sin OC|No se genera orden de compra/i);
  });

  it('DELIVERY_100_RECORD_SAFE + DELIVERY_HISTORY_BOUNDED structural markers', () => {
    const page = read('app/(app)/entregas/page.tsx');
    const panel = read('components/delivery/entrega-panel.tsx');
    const docs = read('components/delivery/delivery-documents-panel.tsx');
    const write = read('components/delivery/entrega-operational-write-desk.tsx');
    const src = page + panel + docs + write;
    assert.match(src, /windowFilteredOpsCollection|boundHistoryItems|ListPageNav|LIST_PAGE_SIZE/);
    assert.doesNotMatch(write, /slice\(0,\s*12\)/);
    const store = readFileSync(
      join(ROOT, '../../packages/os-delivery/src/prisma-store.ts'),
      'utf8',
    );
    const limits = readFileSync(
      join(ROOT, '../../packages/os-delivery/src/list-limits.ts'),
      'utf8',
    );
    assert.match(limits, /DELIVERY_NOTES_LIST_LIMIT\s*=\s*25/);
    assert.match(store, /listDeliveryNotes[\s\S]{0,500}take:\s*DELIVERY_NOTES_LIST_LIMIT/);
  });

  it('business truth non-regression markers stay intact', () => {
    const gate = read('lib/delivery/entrega-gate.ts');
    const restructure = read('lib/delivery/entregas-restructure.test.ts');
    assert.match(restructure, /SALIDA_REQUIRES_NOTA = NO/);
    assert.match(gate, /needs-salida|needs-received-by/);
    const warehouse = read('components/warehouse/warehouse-desk.tsx');
    assert.doesNotMatch(warehouse, /stock oficial|inventario disponible|cantidad cotizada como stock/i);
  });
});
