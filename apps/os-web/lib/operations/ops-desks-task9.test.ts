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

describe('Task 9 final hosted corrective', () => {
  it('Almacén ingreso has a single Pedido field label (field density)', () => {
    const postsale = read('components/warehouse/warehouse-postsale-desk.tsx');
    const handoff = read('components/postsale/pedido-handoff-panel.tsx');
    assert.match(postsale, /density="field"/);
    assert.match(handoff, /density === 'field'|density = 'section'/);
    // Field mode returns without SectionHeader Pedido chrome
    assert.match(handoff, /if \(fieldOnly\)/);
    assert.match(handoff, /label="Pedido"/);
  });

  it('allocatable empty copy is not unknown-availability; remains has one section disclaimer', () => {
    const desk = read('components/warehouse/warehouse-desk.tsx');
    // Empty allocatable must not reuse unknownAvailability copy
    const allocateBlock = desk.slice(desk.indexOf('function AllocateSection'), desk.indexOf('function RemainsSection'));
    assert.doesNotMatch(allocateBlock, /WAREHOUSE_TASK_COPY\.unknownAvailability/);
    assert.match(allocateBlock, /No hay cantidad asignable/);
    const remainsBlock = desk.slice(desk.indexOf('function RemainsSection'), desk.indexOf('function HistorySection'));
    assert.match(remainsBlock, /no representan cumplimiento del pedido/);
    assert.doesNotMatch(remainsBlock, /notFulfillment\}\s*<\/StatusPill>/);
    assert.doesNotMatch(remainsBlock, /WAREHOUSE_TASK_COPY\.notFulfillment/);
  });

  it('waiting vs allocatable source fields stay distinct', () => {
    const viewKnown = buildWarehouseTaskView({
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
    assert.equal(viewKnown.waiting.length, 0);
    assert.equal(viewKnown.allocatable.length, 1);
    assert.ok(viewKnown.allocatable[0]?.availableQuantity);
    assert.doesNotMatch(viewKnown.allocatable[0]?.availableText ?? '', /no está registrada|No es cero/i);

    const viewUnknown = buildWarehouseTaskView({
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
    assert.ok(viewUnknown.waiting.length >= 1);
    assert.equal(viewUnknown.allocatable.length, 0);
    assert.match(viewUnknown.waiting[0]?.waitingText ?? '', /No es cero|no está registrada/i);
  });

  it('Compras pending card can show Solicitado por without internal ids', () => {
    const page = read('app/(app)/compras/page.tsx');
    const card = read('components/purchasing/pending-supply-review-card.tsx');
    assert.match(page, /resolveMemberResponsibilityLabels/);
    assert.match(page, /requesterLabel/);
    assert.match(card, /Solicitado por/);
    assert.match(card, /requesterLabel/);
    assert.doesNotMatch(card, /createdByMemberId/);
    assert.match(card, /Cancelar/);
    assert.match(card, /ResolvePurchasingReviewForm/);
  });

  it('Producción postsale form stays employee-facing without architecture prose', () => {
    const desk = read('components/production/production-postsale-desk.tsx');
    assert.match(desk, /Guardar actualización/);
    assert.doesNotMatch(desk, /Confirmación humana/);
    assert.doesNotMatch(desk, /No se inventa un SLA/);
    assert.doesNotMatch(desk, /selección humana explícita/);
  });
});

  it('WAREHOUSE_LINE_PICKER truthful empty — not generic no-match on Pedido select', () => {
    const handoff = read('components/postsale/pedido-handoff-panel.tsx');
    const select = read('components/experience/searchable-select.tsx');
    // Authoritative lines listed; fixture filter must not empty the ingreso picker.
    assert.match(handoff, /productOptionsForPedido\(selected\)/);
    assert.doesNotMatch(
      handoff,
      /productOptionsForPedido\(selected\)\s*\.filter\(\s*\(option\)\s*=>\s*!isEngineeringFixtureCopy/,
    );
    assert.match(handoff, /Este pedido no tiene líneas disponibles para registrar ingreso/);
    assert.match(handoff, /data-warehouse-line-state="empty"/);
    // Generic no-match only after typed query inside SearchableSelect.
    assert.match(select, /emptyOptionsLabel/);
    assert.match(
      select,
      /options\.length === 0 \|\| !query\.trim\(\) \? emptyOptionsLabel : noMatchLabel/,
    );
  });

  it('BACK_RETURN — Compras review Volver parent + datos-safe history assign', () => {
    const card = read('components/purchasing/pending-supply-review-card.tsx');
    const workNav = read('lib/work/navigation.ts');
    const workPage = read('app/(app)/trabajo/[workItemId]/page.tsx');
    const preserve = read('components/demo/preserve-explicit-data-mode.tsx');
    const crumbs = read('components/shell/shell-breadcrumbs.tsx');
    assert.match(card, /workItemHref\(workItemId, 'compras'\)/);
    assert.match(workNav, /Volver a Compras/);
    assert.match(workNav, /workDetailReturn/);
    assert.match(workPage, /workDetailReturn\(from\)/);
    assert.doesNotMatch(workPage, /href="\/inicio"/);
    assert.match(preserve, /window\.location\.assign\(next\)/);
    assert.doesNotMatch(preserve, /router\.push/);
    assert.match(crumbs, /hrefWithClientDataMode/);
    assert.match(crumbs, /workDetailReturn/);
  });
