import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDeliveryProgress,
  computeEntregaSummaryCounts,
} from './delivery-progress';

describe('buildDeliveryProgress', () => {
  it('builds Pedido / Nota / Salida / Entrega from facts', () => {
    const steps = buildDeliveryProgress({
      orderRecorded: true,
      hasNote: true,
      hasSalida: false,
      hasEntrega: false,
    });
    assert.deepEqual(
      steps.map((step) => ({ id: step.id, mark: step.mark })),
      [
        { id: 'pedido', mark: 'done' },
        { id: 'nota', mark: 'done' },
        { id: 'salida', mark: 'pending' },
        { id: 'entrega', mark: 'pending' },
      ],
    );
  });

  it('never infers Salida or Entrega from Nota alone', () => {
    const steps = buildDeliveryProgress({
      orderRecorded: true,
      hasNote: true,
      hasSalida: false,
      hasEntrega: false,
    });
    assert.equal(steps.find((s) => s.id === 'salida')?.mark, 'pending');
    assert.equal(steps.find((s) => s.id === 'entrega')?.mark, 'pending');
  });

  it('never marks Pedido done without orderRecorded fact', () => {
    const steps = buildDeliveryProgress({
      orderRecorded: false,
      hasNote: true,
      hasSalida: true,
      hasEntrega: true,
    });
    assert.equal(steps.find((s) => s.id === 'pedido')?.mark, 'pending');
  });
});

describe('computeEntregaSummaryCounts', () => {
  it('counts salidas sin entrega and entregas hoy from canonical rows', () => {
    const asOf = new Date('2026-09-16T18:00:00.000Z');
    const counts = computeEntregaSummaryCounts({
      noteCount: 2,
      exits: [{ orderId: 'o-1' }, { orderId: 'o-2' }, { orderId: 'o-1' }],
      deliveries: [
        { orderId: 'o-1', deliveredAt: '2026-09-16T10:00:00.000Z' },
        { orderId: 'o-3', deliveredAt: '2026-09-15T10:00:00.000Z' },
      ],
      asOf,
    });

    assert.equal(counts.notasPreparadas, 2);
    // o-2 has exit without matching delivery; o-1 exit is covered
    assert.equal(counts.salidasSinEntrega, 1);
    assert.equal(counts.entregasHoy, 1);
  });

  it('ignores blank order ids when counting uncovered exits', () => {
    const counts = computeEntregaSummaryCounts({
      noteCount: 0,
      exits: [{ orderId: '  ' }, { orderId: 'o-9' }],
      deliveries: [],
      asOf: new Date('2026-09-16T12:00:00.000Z'),
    });
    assert.equal(counts.salidasSinEntrega, 1);
  });
});
