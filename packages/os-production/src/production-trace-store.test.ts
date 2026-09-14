import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { ZodError } from 'zod';
import {
  PRODUCTION_STEPS,
  PRODUCTION_TRACE_ENTRY_COLUMNS,
  deriveQualityRatios,
  finishedGoodsReceiptAllocatesToOrder,
  productionRecordMayReferenceOrder,
} from '../../os-contracts/src/production-trace';
import { InMemoryProductionTraceStore, ProductionTraceError } from './store';

const occurredAt = '2026-09-14T14:00:00.000Z';
const recordedAt = '2026-09-14T15:00:00.000Z';

const provenance = {
  organizationId: 'org-synthetic',
  actorMemberId: 'member-synthetic',
  actorLabel: 'Operador de prueba',
  source: 'manual' as const,
  occurredAt,
  recordedAt,
  evidence: { reference: 'cuaderno de planta', note: 'anotado en planta' },
};

function store() {
  return new InMemoryProductionTraceStore();
}

describe('production is not keyed to a Pedido', () => {
  it('stores a process record with a product id and no order', () => {
    const trace = store();
    const record = trace.recordProcess('org-synthetic', {
      ...provenance,
      id: 'proc-1',
      productId: 'prod-colaje-1',
      stepKey: 'colaje',
      quemaId: null,
      note: null,
    });

    assert.equal(record.productId, 'prod-colaje-1');
    assert.equal(record.kind, 'process_record');
    assert.equal(Object.hasOwn(record, 'orderId'), false);
    assert.equal(Object.hasOwn(record, 'order_id'), false);
    assert.equal(productionRecordMayReferenceOrder(), false);
    assert.equal(trace.listForProduct('org-synthetic', 'prod-colaje-1').length, 1);
    assert.equal(trace.listForProduct('org-other', 'prod-colaje-1').length, 0);
    assert.equal(trace.get('org-other', 'proc-1'), null);
  });

  it('rejects an order id on a manufacturing record', () => {
    const trace = store();
    assert.throws(
      () =>
        trace.recordProcess('org-synthetic', {
          ...provenance,
          id: 'proc-order',
          productId: 'prod-1',
          stepKey: 'secado',
          orderId: 'pedido-1',
        }),
      /orderId is not a manufacturing field/,
    );
  });

  it('keeps the migration free of an order key and an allocation table', () => {
    const sql = readFileSync(
      join(
        __dirname,
        '../../os-database/prisma/migrations/20260915130000_os_production_trace/migration.sql',
      ),
      'utf8',
    );
    const fragment = readFileSync(
      join(__dirname, '../../os-database/prisma/fragments/production-trace.prisma'),
      'utf8',
    );
    assert.equal(/\border_id\b/.test(sql), false);
    assert.equal(/\bpedido_id\b/.test(sql), false);
    assert.equal(/os_order_allocations/i.test(sql), false);
    assert.equal(/completion_percent/.test(sql), false);
    assert.equal(/\borderId\b/.test(fragment), false);
    assert.equal(/\border_id\b/.test(fragment), false);
    assert.equal(PRODUCTION_TRACE_ENTRY_COLUMNS.includes('product_id' as never), true);
    assert.equal((PRODUCTION_TRACE_ENTRY_COLUMNS as readonly string[]).includes('order_id'), false);
    assert.equal((PRODUCTION_TRACE_ENTRY_COLUMNS as readonly string[]).includes('completion_percent'), false);
  });
});

describe('quema', () => {
  it('can contain multiple product ids and does not require an order', () => {
    const trace = store();
    const opened = trace.openQuema('org-synthetic', {
      id: 'quema-1',
      organizationId: 'org-synthetic',
      actorLabel: 'Operador de prueba',
      source: 'manual',
      recordedAt,
      evidence: { reference: null, note: null },
      startedAt: occurredAt,
    });

    assert.equal(opened.startedAt, occurredAt);
    assert.equal(opened.endedAt, null);
    assert.equal(Object.hasOwn(opened, 'orderId'), false);
    assert.deepEqual(opened.products, []);

    trace.attachQuemaProduct('org-synthetic', {
      ...provenance,
      id: 'quema-1-p1',
      quemaId: 'quema-1',
      productId: 'prod-a',
      quantity: null,
    });
    trace.attachQuemaProduct('org-synthetic', {
      ...provenance,
      id: 'quema-1-p2',
      quemaId: 'quema-1',
      productId: 'prod-b',
      quantity: '12',
      unit: 'piezas',
    });

    const mixed = trace.getQuema('org-synthetic', 'quema-1');
    assert.deepEqual(
      mixed.products.map((item) => item.productId).sort(),
      ['prod-a', 'prod-b'],
    );
    assert.equal(mixed.products.find((item) => item.productId === 'prod-a')?.quantity, null);

    trace.attachQuemaProduct('org-synthetic', {
      ...provenance,
      id: 'quema-1-p1-qty',
      quemaId: 'quema-1',
      productId: 'prod-a',
      quantity: '4',
      unit: 'piezas',
      recordedAt: '2026-09-14T16:00:00.000Z',
    });
    const withQuantity = trace.getQuema('org-synthetic', 'quema-1');
    assert.equal(withQuantity.products.find((item) => item.productId === 'prod-a')?.quantity, '4');
    assert.equal(Object.hasOwn(withQuantity, 'orderId'), false);

    const ended = trace.endQuema('org-synthetic', {
      id: 'quema-1-end',
      organizationId: 'org-synthetic',
      quemaId: 'quema-1',
      endedAt: '2026-09-14T18:00:00.000Z',
      actorLabel: 'Operador de prueba',
      source: 'manual',
      occurredAt: '2026-09-14T18:00:00.000Z',
      recordedAt: '2026-09-14T18:05:00.000Z',
      evidence: { reference: null, note: null },
    });
    assert.equal(ended.startedAt, occurredAt);
    assert.equal(ended.endedAt, '2026-09-14T18:00:00.000Z');
    assert.equal(ended.products.length, 2);
  });
});

describe('finished goods receipt', () => {
  it('is warehouse Listo and does not allocate to an order', () => {
    const trace = store();
    const receipt = trace.recordFinishedGoodsReceipt('org-synthetic', {
      ...provenance,
      id: 'receipt-1',
      productId: 'prod-finished',
      quantity: '6',
    });

    assert.equal(receipt.kind, 'finished_goods_receipt');
    assert.equal(receipt.productId, 'prod-finished');
    assert.equal(receipt.warehouseLabel, 'Almacén de Productos Terminados');
    assert.equal(receipt.allocatesToOrder, false);
    assert.equal(receipt.postsStock, false);
    assert.equal(Object.hasOwn(receipt, 'orderId'), false);
    assert.equal(finishedGoodsReceiptAllocatesToOrder(), false);
    assert.equal(trace.isListo('org-synthetic', 'prod-finished'), true);
    assert.equal(trace.isListo('org-synthetic', 'prod-other'), false);
    assert.equal(trace.isListo('org-other', 'prod-finished'), false);
    assert.equal('orderAllocations' in trace, false);
    assert.equal('allocateToOrder' in trace, false);
  });

  it('does not treat a process step or a quema end as Listo', () => {
    const trace = store();
    trace.recordProcess('org-synthetic', {
      ...provenance,
      id: 'proc-warehouse-step',
      productId: 'prod-not-ready',
      stepKey: 'almacen_productos_terminados',
      quemaId: null,
      note: null,
    });
    trace.openQuema('org-synthetic', {
      id: 'quema-not-ready',
      organizationId: 'org-synthetic',
      actorLabel: 'Operador de prueba',
      source: 'manual',
      recordedAt,
      evidence: { reference: null, note: null },
      startedAt: occurredAt,
    });
    trace.endQuema('org-synthetic', {
      id: 'quema-not-ready-end',
      organizationId: 'org-synthetic',
      quemaId: 'quema-not-ready',
      endedAt: recordedAt,
      actorLabel: 'Operador de prueba',
      source: 'manual',
      occurredAt: recordedAt,
      recordedAt,
      evidence: { reference: null, note: null },
    });
    assert.equal(trace.isListo('org-synthetic', 'prod-not-ready'), false);
  });
});

describe('loss', () => {
  it('stores quantity, percentage, and reason, and appends a correction', () => {
    const trace = store();
    const loss = trace.recordLoss('org-synthetic', {
      ...provenance,
      id: 'loss-1',
      productId: 'prod-a',
      stepKey: 'secado',
      quantityLost: '2',
      percentageLost: '10',
      reason: 'grieta en el secado',
    });

    assert.equal(loss.quantityLost, '2');
    assert.equal(loss.percentageLost, '10');
    assert.equal(loss.reason, 'grieta en el secado');
    assert.equal(loss.productId, 'prod-a');
    assert.equal(loss.stepKey, 'secado');
    assert.equal(loss.actorLabel, 'Operador de prueba');
    assert.equal(loss.source, 'manual');
    assert.equal(loss.occurredAt, occurredAt);

    const correction = trace.correctLoss('org-synthetic', {
      ...provenance,
      id: 'loss-1-correction',
      productId: 'prod-a',
      stepKey: 'secado',
      quantityLost: '3',
      percentageLost: '12.5',
      reason: 'conteo revisado',
      correctsEntryId: 'loss-1',
      correctionReason: 'el primer conteo omitió una pieza',
      recordedAt: '2026-09-14T16:00:00.000Z',
    });

    const original = trace.get('org-synthetic', 'loss-1');
    assert.equal(original && original.kind === 'loss' && original.quantityLost, '2');
    assert.equal(correction.quantityLost, '3');
    assert.deepEqual(
      trace.correctionHistory('org-synthetic', 'loss-1-correction').map((item) => item.id),
      ['loss-1', 'loss-1-correction'],
    );
    assert.throws(
      () =>
        trace.correctLoss('org-other', {
          ...provenance,
          id: 'loss-other-org',
          organizationId: 'org-other',
          productId: null,
          stepKey: 'secado',
          quantityLost: '1',
          percentageLost: '1',
          reason: 'otro tenant',
          correctsEntryId: 'loss-1',
          correctionReason: 'no debe cruzar organización',
        }),
      ProductionTraceError,
    );
  });

  it('allows a loss without a product id and still stores the three facts', () => {
    const trace = store();
    const loss = trace.recordLoss('org-synthetic', {
      ...provenance,
      id: 'loss-step',
      productId: null,
      stepKey: 'molienda',
      quantityLost: '0.5',
      percentageLost: '4',
      reason: 'merma de pasta',
    });
    assert.equal(loss.productId, null);
    assert.equal(loss.quantityLost, '0.5');
    assert.equal(loss.percentageLost, '4');
    assert.equal(loss.reason, 'merma de pasta');
  });
});

describe('quality ratios', () => {
  it('derives percent good and percent lost only when both counts exist', () => {
    assert.equal(deriveQualityRatios(8, 2)?.goodPercent, '80');
    assert.equal(deriveQualityRatios(8, 2)?.lostPercent, '20');
    assert.equal(deriveQualityRatios(8, 2)?.denominator, 10);
    assert.equal(deriveQualityRatios(8, null), null);
    assert.equal(deriveQualityRatios(null, 2), null);
    assert.equal(deriveQualityRatios(null, null), null);
    assert.equal(deriveQualityRatios(0, 0), null);

    const trace = store();
    const classification = trace.recordClassification('org-synthetic', {
      ...provenance,
      id: 'class-1',
      productId: 'prod-a',
      goodCount: 8,
      lostCount: null,
    });
    assert.equal(classification.goodCount, 8);
    assert.equal(classification.lostCount, null);
    assert.equal(classification.stepKey, 'clasificacion');
    assert.equal(Object.hasOwn(classification, 'completionPercent'), false);
    assert.equal(Object.hasOwn(classification, 'goodPercent'), false);
    assert.equal(Object.hasOwn(classification, 'lostPercent'), false);
    assert.equal(deriveQualityRatios(classification.goodCount, classification.lostCount), null);
  });
});

describe('consumption', () => {
  it('does not mutate stock', () => {
    const trace = store();
    assert.equal(trace.inputStockBalance('org-synthetic', 'pasta'), null);
    const before = trace.inputStockBalance('org-synthetic', 'pasta');

    const consumption = trace.recordConsumption('org-synthetic', {
      ...provenance,
      id: 'cons-1',
      stepKey: 'horno',
      category: 'fuel',
      description: 'gas del horno',
      reference: 'medidor 4',
      quantity: '18',
      unit: 'm3',
    });

    assert.equal(consumption.category, 'fuel');
    assert.equal(consumption.categoryLabel, 'combustible');
    assert.equal(consumption.inventoryEffect, 'none');
    assert.equal(consumption.quantity, '18');
    assert.equal(Object.hasOwn(consumption, 'inventoryMovementId'), false);
    assert.equal(trace.inputStockBalance('org-synthetic', 'pasta'), before);
    assert.equal(trace.inputStockBalance('org-synthetic', 'medidor 4'), null);
    assert.equal('decrementStock' in trace, false);
    assert.equal('applyInventory' in trace, false);
    assert.throws(() => trace.recordConsumption('org-synthetic', { ...provenance, id: 'cons-stock', stepKey: 'horno', category: 'fuel', description: 'gas', quantity: '1', unit: 'm3', inventoryMovementId: 'mov-1' }), /inventoryMovementId/);
  });

  it('keeps the Spanish category labels', () => {
    const trace = store();
    const raw = trace.recordConsumption('org-synthetic', {
      ...provenance,
      id: 'cons-raw',
      stepKey: 'laboratorio',
      category: 'raw_material',
      description: 'arcilla',
      reference: null,
      quantity: '20',
      unit: 'kg',
    });
    const supply = trace.recordConsumption('org-synthetic', {
      ...provenance,
      id: 'cons-supply',
      stepKey: 'esmaltado',
      category: 'supply',
      description: 'esponja',
      reference: null,
      quantity: '2',
      unit: 'unidades',
    });
    assert.equal(raw.categoryLabel, 'materia prima');
    assert.equal(supply.categoryLabel, 'insumos');
  });
});

describe('governed steps', () => {
  it('uses the Spanish names in order and rejects a renamed step', () => {
    assert.deepEqual(
      PRODUCTION_STEPS.map((step) => step.label),
      [
        'Laboratorio — preparación de materia prima y esmalte',
        'Molienda',
        'Colaje',
        'Secado',
        'Pulido',
        'Esmaltado',
        'Carga y Limpieza',
        'Horno',
        'Resane',
        'Clasificación',
        'Almacén de Productos Terminados',
      ],
    );
    assert.throws(
      () =>
        store().recordProcess('org-synthetic', {
          ...provenance,
          id: 'proc-bad-step',
          productId: 'prod-1',
          stepKey: 'bisque',
        }),
      ZodError,
    );

    const panel = readFileSync(
      join(__dirname, '../../../apps/os-web/components/production/production-panel.tsx'),
      'utf8',
    );
    for (const step of PRODUCTION_STEPS) {
      assert.equal(panel.includes(step.label), true, step.label);
    }
  });
});

describe('provenance', () => {
  it('keeps actor, source, occurredAt, recordedAt, and evidence', () => {
    const trace = store();
    const record = trace.recordProcess('org-synthetic', {
      ...provenance,
      id: 'proc-prov',
      productId: 'prod-1',
      stepKey: 'pulido',
      quemaId: null,
      note: null,
    });
    assert.equal(record.actorMemberId, 'member-synthetic');
    assert.equal(record.actorLabel, 'Operador de prueba');
    assert.equal(record.source, 'manual');
    assert.equal(record.occurredAt, occurredAt);
    assert.equal(record.recordedAt, recordedAt);
    assert.deepEqual(record.evidence, { reference: 'cuaderno de planta', note: 'anotado en planta' });
    assert.throws(
      () =>
        trace.recordProcess('org-synthetic', {
          ...provenance,
          id: 'proc-channel',
          productId: 'prod-1',
          stepKey: 'pulido',
          source: 'whatsapp',
        }),
      ZodError,
    );
  });
});
