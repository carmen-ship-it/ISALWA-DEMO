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
    assert.match(table, /min-w-\[7\.5rem\]/);
    assert.doesNotMatch(table, /label: ''/);

    assert.match(scan, /min-w-\[7rem\]/);
    assert.match(scan, /min-w-\[10rem\]/);
    assert.match(scan, /data-scan-row-open/);
    // View/open actions stay outlined; request uses primaryAction slot.
    assert.match(scan, /isalwa-scan-row-action/);
  });
});
