import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dataModeForRedirect, explicitDataMode, withExplicitDataMode } from './preserve-data-mode';

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
    assert.equal(withExplicitDataMode('/clientes/p?tab=historial', null), '/clientes/p?tab=historial');
    assert.equal(withExplicitDataMode('/inicio?lente=gerencia', undefined), '/inicio?lente=gerencia');
    assert.equal(
      withExplicitDataMode('/clientes/p?tab=historial', 'real'),
      '/clientes/p?tab=historial&datos=real',
    );
  });
});

describe('dataModeForRedirect', () => {
  it('prefers the form, then the referer, then an explicit cookie, and never invents a mode', () => {
    assert.equal(
      dataModeForRedirect({ formDatos: 'demo', refererDatos: 'real', cookieDatos: 'real' }),
      'demo',
    );
    assert.equal(dataModeForRedirect({ formDatos: '', refererDatos: 'real', cookieDatos: 'demo' }), 'real');
    assert.equal(dataModeForRedirect({ cookieDatos: 'demo' }), 'demo');
    assert.equal(dataModeForRedirect({ cookieDatos: 'not-a-mode' }), null);
    assert.equal(dataModeForRedirect({}), null);
    assert.equal(
      withExplicitDataMode('/clientes/p/cotizaciones/q', dataModeForRedirect({ refererDatos: 'demo' })),
      '/clientes/p/cotizaciones/q?datos=demo',
    );
    assert.equal(
      withExplicitDataMode('/clientes/p/pedidos/o?resultado=pedido', dataModeForRedirect({ formDatos: 'real' })),
      '/clientes/p/pedidos/o?resultado=pedido&datos=real',
    );
  });
});
