import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { explicitDataMode, withExplicitDataMode } from './preserve-data-mode';

describe('withExplicitDataMode', () => {
  it('keeps demo on redirects and tabs without forcing demo onto a bare URL', () => {
    assert.equal(explicitDataMode('demo'), 'demo');
    assert.equal(explicitDataMode('real'), 'real');
    assert.equal(explicitDataMode(null), null);
    assert.equal(
      withExplicitDataMode('/clientes/p?tab=historial', 'demo'),
      '/clientes/p?tab=historial&datos=demo',
    );
    assert.equal(
      withExplicitDataMode('/aprobaciones/a', 'real'),
      '/aprobaciones/a?datos=real',
    );
    assert.equal(withExplicitDataMode('/clientes/p', null), '/clientes/p');
    assert.equal(
      withExplicitDataMode('/inicio?lente=gerencia&datos=demo', 'demo'),
      '/inicio?lente=gerencia&datos=demo',
    );
  });
});
