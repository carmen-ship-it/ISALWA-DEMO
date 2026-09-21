import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('visual hierarchy contract', () => {
  it('PRODUCTION_DUPLICATE_PEDIDO_LABEL = 0 and primary update is filled', () => {
    const handoff = read('components/postsale/pedido-handoff-panel.tsx');
    const production = read('components/production/production-ops-table.tsx');
    assert.match(handoff, /labelVisibility=\{fieldOnly \? 'visible' : 'sr-only'\}/);
    assert.match(handoff, /Pedido seleccionado/);
    assert.match(handoff, />Cambiar</);
    assert.doesNotMatch(handoff, /<dt className="text-\[var\(--isalwa-slate\)\]">Pedido<\/dt>/);
    assert.match(production, /variant="primary"[\s\S]{0,180}requestUpdate/);
  });

  it('warehouse ingreso stays disabled without selection and rows are structured', () => {
    const ingreso = read('components/warehouse/warehouse-postsale-desk.tsx');
    const desk = read('components/warehouse/warehouse-desk.tsx');
    assert.match(ingreso, /orderId && orderLineId/);
    assert.match(ingreso, /permanece deshabilitado/);
    assert.match(desk, /line-clamp-2/);
    assert.match(desk, /pendientes/);
    assert.match(desk, /asignados/);
    assert.match(desk, /font-semibold text-\[var\(--isalwa-kiln\)\]/);
    assert.doesNotMatch(desk, /\{humanWarehouseText\(pedido\.optionLabel\)/);
  });

  it('compras resolve is primary and entrega actions are not equal', () => {
    const review = read('components/purchasing/pending-supply-review-card.tsx');
    const delivery = read('components/delivery/delivery-documents-panel.tsx');
    assert.match(review, /variant="primary"/);
    assert.match(review, /Resolver revisión/);
    assert.match(review, /bg-\[var\(--isalwa-status-amber-bg\)\]/);
    assert.match(delivery, /Próxima acción/);
    assert.match(delivery, /variant="secondary"/);
    assert.match(delivery, /canSubmitEntrega \? 'contextual' : 'secondary'/);
    assert.match(delivery, /gate === 'needs-salida' \? 'primary' : 'secondary'/);
  });

  it('trabajo counters, scan wrap, and pagination chrome stay', () => {
    const trabajo = read('app/(app)/trabajo/page.tsx');
    const scan = read('components/lists/operating-scan-row.tsx');
    assert.match(trabajo, /bg-\[var\(--isalwa-teal-100\)\]/);
    assert.match(trabajo, /summary\.vencido > 0/);
    assert.match(trabajo, /ListPageNav/);
    assert.match(scan, /line-clamp-2/);
    assert.doesNotMatch(scan, /md:truncate/);
  });
});
