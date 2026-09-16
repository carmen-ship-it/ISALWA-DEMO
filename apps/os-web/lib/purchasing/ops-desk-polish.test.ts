import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Wave 2 operational polish', () => {
  it('keeps loadMemberCapabilities hydration on production, warehouse, compras, and coordination loaders', () => {
    const produccion = read('app/(app)/produccion/page.tsx');
    const almacen = read('app/(app)/almacen/page.tsx');
    const compras = read('lib/purchasing/load-queue.ts');
    const coordinacion = read('lib/coordination/load.ts');
    assert.match(produccion, /loadMemberCapabilities/);
    assert.match(almacen, /loadMemberCapabilities/);
    assert.match(compras, /loadMemberCapabilities/);
    assert.match(coordinacion, /loadMemberCapabilities/);
    assert.match(produccion, /member\.roleKeys are not a second grant source/);
    assert.match(almacen, /never treat session\/me as a grant source/);
    assert.doesNotMatch(almacen, /getAuthenticatedSession\(\)/);
  });

  it('keeps sticky Guardar / Registrar actions on long operational forms', () => {
    const production = read('components/production/production-workspace.tsx');
    const stickyClass = read('components/production/ops-desk-surface.tsx');
    const warehouse = read('components/warehouse/warehouse-desk.tsx');
    const coordination = read('components/coordination/coordination-decision-form.tsx');
    const finance = read('components/finance/finance-operational-desk.tsx');
    const approvals = read('components/commercial/commercial-approval-panel.tsx');

    assert.match(stickyClass, /sticky bottom-0/);
    assert.match(production, /OPS_STICKY_ACTION_CLASS[\s\S]*Guardar/);
    assert.match(warehouse, /OPS_STICKY_ACTION_CLASS[\s\S]*Asignar al pedido/);
    assert.match(coordination, /OPS_STICKY_ACTION_CLASS[\s\S]*COORDINATION_RECORD_BUTTON/);
    assert.match(finance, /button\[type=submit\]\]:sticky/);
    assert.match(approvals, /OPS_STICKY_ACTION_CLASS[\s\S]*Aprobar/);
  });

  it('shows honest empty / manual / non-ledger provenance on operational desks', () => {
    const productos = read('app/(app)/productos/page.tsx');
    const compras = read('components/purchasing/purchase-request-panel.tsx');
    const entregas = read('components/delivery/entrega-panel.tsx');
    const finance = read('components/finance/finance-operational-desk.tsx');
    const warehouse = read('components/warehouse/warehouse-desk.tsx');

    assert.match(productos, /No es lista de precios/);
    assert.match(productos, /Vista previa/);
    assert.match(compras, /No es inventario/);
    assert.match(compras, /entregado'\) return 'success'/);
    assert.match(compras, /permissionTitle/);
    assert.match(compras, /data-compras-status="denied"/);
    assert.doesNotMatch(compras, /AccessDeniedState/);
    assert.match(entregas, /No confirma pago en el libro/);
    assert.match(finance, /Dato manual/);
    assert.match(finance, /No es libro contable/);
    assert.match(warehouse, /notOfficialStock/);
    assert.doesNotMatch(warehouse, /stockTotal/);
    assert.doesNotMatch(compras, /faltante|shortage|punto de reorden/i);
  });

  it('uses sentence-case Spanish for coordination record action', () => {
    const model = read('lib/coordination/page-model.ts');
    assert.match(model, /Registrar decisión/);
    assert.doesNotMatch(model, /REGISTRAR DECISIÓN/);
  });
});
