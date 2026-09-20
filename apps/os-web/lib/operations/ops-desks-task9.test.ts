import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { WAREHOUSE_TASK_COPY, buildWarehouseTaskView } from '@isalwa/os-contracts';

const root = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Task 9 — operations desks productization', () => {
  it('PRODUCTION_DENSE_QUEUE + employee form without architecture prose', () => {
    const table = read('components/production/production-ops-table.tsx');
    const page = read('app/(app)/produccion/page.tsx');
    const desk = read('components/production/production-postsale-desk.tsx');
    const handoff = read('components/postsale/pedido-handoff-panel.tsx');
    assert.match(table, /label: 'Revisión'/);
    assert.match(table, /label: 'Última actualización'/);
    assert.match(page, /<OpsDeskInfoBanner/);
    assert.match(desk, /Registrar actualización de producción/);
    assert.match(desk, /Guardar actualización/);
    assert.doesNotMatch(desk, /Confirmación humana/);
    assert.doesNotMatch(desk, /No se inventa un SLA/);
    assert.doesNotMatch(handoff, /No escriba identificadores internos/);
    assert.doesNotMatch(handoff, /selección humana explícita/);
    assert.doesNotMatch(handoff, /heredan del pedido/);
  });

  it('WAREHOUSE form + labels + no repeated no-stock badges', () => {
    const page = read('app/(app)/almacen/page.tsx');
    const desk = read('components/warehouse/warehouse-desk.tsx');
    const postsale = read('components/warehouse/warehouse-postsale-desk.tsx');
    assert.equal(WAREHOUSE_TASK_COPY.title, 'Registro de ingreso de producto terminado');
    assert.match(postsale, /Registrar ingreso de producto terminado/);
    assert.match(postsale, /'Registrar ingreso'|Registrar ingreso/);
    assert.doesNotMatch(postsale, /No escriba identificadores/);
    assert.doesNotMatch(postsale, /No es asignación/);
    assert.doesNotMatch(postsale, /Control Tower/);
    assert.doesNotMatch(desk, /notOfficialStock\}\s*<\/StatusPill>/);
    assert.doesNotMatch(desk, /WAREHOUSE_TASK_COPY\.notOfficialStock\}\s*<\/StatusPill>/);
    assert.equal(desk.includes('WAREHOUSE_TASK_COPY.notOfficialStock}</StatusPill>'), false);
    assert.match(desk, /pedidoHumanLabel|Pedido \$\{/);
    assert.doesNotMatch(page, /Asignación a pedido/);
  });

  it('WAREHOUSE waiting vs allocatable are distinct facts', () => {
    const view = buildWarehouseTaskView({
      organizationId: 'org-a',
      receipts: [
        {
          organizationId: 'org-a',
          productId: 'prod-1',
          productLabel: 'Capri',
          quantity: '4',
          receiptId: 'r1',
        },
      ],
      pedidos: [
        {
          organizationId: 'org-a',
          orderId: 'o1',
          orderLabel: 'O-000005',
          customerId: 'c1',
          customerLabel: 'DEMO CONSTRUCTORA ANDINA',
          orderLineId: 'ol1',
          productId: 'prod-1',
          productLabel: 'Capri',
          orderedQuantity: '4',
        },
      ],
      allocations: [],
      corrections: [],
    });
    assert.equal(view.waiting.length, 0);
    assert.equal(view.allocatable.length, 1);
    assert.equal(view.allocatable[0]?.productName.text, 'Capri');
    assert.doesNotMatch(view.allocatable[0]?.availableText ?? '', /No es stock oficial/);
    assert.equal(view.pedidos[0]?.optionLabel.includes('El nombre no fue registrado'), false);
    assert.match(view.pedidos[0]?.optionLabel ?? '', /Pedido O-000005/);
    assert.match(view.pedidos[0]?.optionLabel ?? '', /DEMO CONSTRUCTORA ANDINA/);

    const unknown = buildWarehouseTaskView({
      organizationId: 'org-a',
      receipts: null,
      pedidos: [
        {
          organizationId: 'org-a',
          orderId: 'o1',
          orderLabel: 'O-000006',
          customerId: 'c1',
          customerLabel: 'DEMO MADERAS ORIENTE',
          orderLineId: 'ol1',
          productId: 'prod-1',
          productLabel: 'Capri',
          orderedQuantity: null,
        },
      ],
      allocations: [],
      corrections: [],
    });
    assert.ok(unknown.waiting.length >= 1);
    assert.equal(unknown.allocatable.length, 0);
  });

  it('PURCHASING empty-with-pending + resolve layout + OC once', () => {
    const page = read('app/(app)/compras/page.tsx');
    const panel = read('components/purchasing/purchase-request-panel.tsx');
    const card = read('components/purchasing/pending-supply-review-card.tsx');
    const queue = read('lib/purchasing/queue.ts');
    assert.equal((page.match(/<OpsDeskInfoBanner/g) || []).length, 1);
    assert.match(page, /No se genera orden de compra automática/);
    assert.match(queue, /emptyQueueWithPendingTitle: 'No hay nuevas solicitudes en la cola\.'/);
    assert.match(panel, /emptyQueueWithPendingTitle/);
    assert.doesNotMatch(panel, /Las órdenes de compra aún no se generan/);
    assert.match(card, /Resolver revisión/);
    assert.match(card, /Cancelar/);
    assert.match(card, /ResolvePurchasingReviewForm/);
    assert.match(card, /Cliente/);
    assert.match(card, /Pendiente/);
  });
});
