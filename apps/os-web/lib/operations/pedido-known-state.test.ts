import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PEDIDO_KNOWN_STATE_COPY,
  buildPedidoKnownState,
} from './pedido-known-state';

describe('buildPedidoKnownState', () => {
  it('lists CONFIRMADO / PENDIENTE / NO REGISTRADO from facts only', () => {
    const view = buildPedidoKnownState({
      orderNumber: 'O-100',
      customerName: 'Cerámica Local',
      ownerLabel: 'Ana',
      statusLabel: 'Abierto',
      sourceQuoteNumber: 'Q-9',
      totalLabel: '$100.00',
      createdAtLabel: '10 sep 2026',
      hasOpenPrepReviews: true,
      finishedGoodsEvidence: false,
      hasDeliveryNote: false,
      hasSalida: false,
      hasEntrega: false,
      nextSafeAction: 'Solicitar revisión de producción',
      whoToAsk: 'Ana',
    });

    assert.ok(view.confirmado.some((row) => row.includes('O-100')));
    assert.ok(view.confirmado.some((row) => row.includes('Cerámica Local')));
    assert.ok(view.confirmado.some((row) => row.includes('Q-9')));
    assert.deepEqual(view.pendienteDeConfirmar, [
      'Revisión operativa solicitada — espera respuesta del área.',
    ]);
    assert.ok(view.noRegistrado.includes('Ingreso de producto terminado.'));
    assert.ok(view.noRegistrado.includes('Nota de entrega.'));
    assert.ok(view.noRegistrado.includes('Salida de almacén.'));
    assert.ok(view.noRegistrado.includes('Entrega al cliente.'));
    assert.equal(view.recomendacion, 'Solicitar revisión de producción');
    assert.equal(view.aQuienPreguntar, 'Ana');
  });

  it('moves recorded fulfillment facts into CONFIRMADO and drops them from NO REGISTRADO', () => {
    const view = buildPedidoKnownState({
      orderNumber: 'O-200',
      customerName: 'Cliente',
      ownerLabel: null,
      statusLabel: 'Abierto',
      sourceQuoteNumber: null,
      totalLabel: null,
      createdAtLabel: null,
      hasOpenPrepReviews: false,
      finishedGoodsEvidence: true,
      hasDeliveryNote: true,
      hasSalida: true,
      hasEntrega: true,
      nextSafeAction: null,
      whoToAsk: null,
    });

    assert.ok(view.confirmado.some((row) => /producto terminado/i.test(row)));
    assert.ok(view.confirmado.some((row) => /Nota de entrega/i.test(row)));
    assert.ok(view.confirmado.some((row) => /Salida/i.test(row)));
    assert.ok(view.confirmado.some((row) => /Entrega al cliente/i.test(row)));
    assert.deepEqual(view.pendienteDeConfirmar, []);
    assert.ok(view.noRegistrado.includes('Cotización de origen no vinculada en este registro.'));
    assert.ok(!view.noRegistrado.some((row) => /producto terminado/i.test(row)));
    assert.equal(view.recomendacion, null);
    assert.equal(view.aQuienPreguntar, null);
  });

  it('exposes the three certainty headings required by CT3', () => {
    assert.equal(PEDIDO_KNOWN_STATE_COPY.confirmado, 'CONFIRMADO');
    assert.equal(PEDIDO_KNOWN_STATE_COPY.pendiente, 'PENDIENTE DE CONFIRMAR');
    assert.equal(PEDIDO_KNOWN_STATE_COPY.noRegistrado, 'NO REGISTRADO');
    assert.equal(PEDIDO_KNOWN_STATE_COPY.recomendacion, 'RECOMENDACIÓN');
    assert.equal(PEDIDO_KNOWN_STATE_COPY.aQuienPreguntar, 'A QUIÉN PREGUNTAR');
  });
});
