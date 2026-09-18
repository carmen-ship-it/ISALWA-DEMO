import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { entregaEnabled, entregaGate } from '@/lib/delivery/entrega-gate';

describe('entrega requires salida and recibido por', () => {
  it('blocks entrega when no salida exists', () => {
    assert.equal(entregaGate({ hasSalida: false, receivedBy: 'Ana' }), 'needs-salida');
    assert.equal(entregaEnabled({ hasSalida: false, receivedBy: 'Ana' }), false);
  });

  it('blocks entrega when salida exists but recibido por is empty', () => {
    assert.equal(entregaGate({ hasSalida: true, receivedBy: '   ' }), 'needs-received-by');
    assert.equal(entregaEnabled({ hasSalida: true, receivedBy: '' }), false);
  });

  it('enables entrega when salida and recibido por both exist', () => {
    assert.equal(entregaGate({ hasSalida: true, receivedBy: 'Encargado del local' }), 'ready');
    assert.equal(entregaEnabled({ hasSalida: true, receivedBy: 'Encargado del local' }), true);
  });
});
