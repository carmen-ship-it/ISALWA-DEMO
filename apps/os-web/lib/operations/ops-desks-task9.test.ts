import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { WAREHOUSE_TASK_COPY } from '@isalwa/os-contracts';

const root = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Task 9 — operations desks productization', () => {
  it('PRODUCTION_DENSE_QUEUE: Pedido / Cliente / Revisión / Última actualización / Responsable / Estado / Acción', () => {
    const table = read('components/production/production-ops-table.tsx');
    const page = read('app/(app)/produccion/page.tsx');
    assert.match(table, /label: 'Pedido'/);
    assert.match(table, /label: 'Cliente'/);
    assert.match(table, /label: 'Revisión'/);
    assert.match(table, /label: 'Última actualización'/);
    assert.match(table, /label: 'Responsable'/);
    assert.match(table, /label: 'Estado'/);
    assert.match(table, /Ver revisión|Solicitar|Ver solicitud/);
    assert.match(page, /<OpsDeskInfoBanner/);
    const bannerAt = page.indexOf('<OpsDeskInfoBanner');
    const tableAt = page.indexOf('<ProductionOpsTable');
    assert.ok(bannerAt > 0 && tableAt > bannerAt, 'page truth once, then queue');
    assert.match(page, /<details[\s\S]*Registrar actualización/);
  });

  it('WAREHOUSE_SEMANTIC_COPY: ingreso PT, not asignación-as-title', () => {
    const page = read('app/(app)/almacen/page.tsx');
    assert.equal(WAREHOUSE_TASK_COPY.title, 'Registro de ingreso de producto terminado');
    assert.match(page, /WAREHOUSE_TASK_COPY\.title/);
    assert.doesNotMatch(page, /Asignación a pedido/);
    assert.match(page, /<OpsDeskInfoBanner/);
    assert.match(page, /No es stock/);
    assert.match(page, /No es entrega/);
    assert.match(page, /Registrar ingreso/);
    assert.match(page, /WarehousePostSaleDesk/);
  });

  it('PURCHASING_DENSE_QUEUE: one banner, pending primary, vincular collapsible', () => {
    const page = read('app/(app)/compras/page.tsx');
    const panel = read('components/purchasing/purchase-request-panel.tsx');
    assert.equal((page.match(/<OpsDeskInfoBanner/g) || []).length, 1);
    assert.match(page, /Revisiones pendientes/);
    assert.match(page, /Pedidos para vincular/);
    assert.match(page, /<details[\s\S]*Pedidos para vincular/);
    assert.match(page, /ResolvePurchasingReviewForm/);
    assert.doesNotMatch(panel, /No es inventario/);
    assert.doesNotMatch(panel, /No prueba falta de stock/);
    assert.match(panel, /permissionTitle/);
    assert.match(panel, /COMPRAS_COPY\.loading/);
  });
});
