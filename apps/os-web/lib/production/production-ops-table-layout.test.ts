import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const root = resolve(import.meta.dirname, '../..');

describe('production Pedidos en contexto table contract', () => {
  it('keeps seven labeled columns and intentional Acciones controls', () => {
    const table = readFileSync(resolve(root, 'components/production/production-ops-table.tsx'), 'utf8');
    const scan = readFileSync(resolve(root, 'components/lists/operating-scan-row.tsx'), 'utf8');

    for (const label of ['Pedido', 'Cliente', 'Revisión', 'Última actualización', 'Responsable', 'Estado', 'Acciones']) {
      assert.match(table, new RegExp(`label: '${label}'`));
    }
    assert.match(table, /data-production-ops-table/);
    assert.match(table, /data-production-action="solicitar-actualizacion"/);
    assert.match(table, /data-production-action="ver-revision"/);
    assert.match(table, /data-production-action="ver-solicitud"/);
    assert.match(table, /primaryAction=\{requestAction\}/);
    assert.match(table, /secondaryActions=\{viewAction\}/);
    assert.match(table, /variant="primary"/);
    assert.match(table, /minmax\(10\.5rem,auto\)/);
    assert.match(table, /md:min-w-\[7\.5rem\]/);
    assert.doesNotMatch(table, /label: ''/);
    // Phone: stacked cards, no horizontal page scroll.
    assert.match(table, /overflow-hidden/);
    assert.match(table, /md:overflow-x-auto/);
    assert.doesNotMatch(table, /mt-4 overflow-x-auto /);
    assert.match(table, /hideOnMobile: true/);

    assert.match(scan, /md:min-w-\[7rem\]/);
    assert.match(scan, /md:min-w-\[10rem\]/);
    assert.match(scan, /h-11/);
    assert.match(scan, /sm:h-8/);
    assert.match(scan, /data-scan-row-open/);
    // View/open actions stay outlined; request uses primaryAction slot.
    assert.match(scan, /isalwa-scan-row-action/);
  });
});
