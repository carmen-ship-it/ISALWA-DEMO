import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { explicitDataMode, samePathQueryNavigation, withExplicitDataMode } from './preserve-data-mode';

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

describe('samePathQueryNavigation', () => {
  it('assigns a same-path tab change and keeps tab and datos', () => {
    const decision = samePathQueryNavigation(
      '/clientes/p?datos=demo',
      '/clientes/p?tab=historial&datos=demo',
    );
    assert.equal(decision.kind, 'assign');
    assert.equal(decision.href, '/clientes/p?tab=historial&datos=demo');
    const landed = new URL(decision.href, 'http://local.invalid');
    assert.equal(landed.searchParams.get('tab'), 'historial');
    assert.equal(landed.searchParams.get('datos'), 'demo');
  });

  it('assigns a same-path lente change and does not require story on the destination', () => {
    const decision = samePathQueryNavigation(
      '/inicio?datos=demo&story=1',
      '/inicio?lente=gerencia&datos=demo',
    );
    assert.equal(decision.kind, 'assign');
    assert.equal(decision.href, '/inicio?lente=gerencia&datos=demo');
    const landed = new URL(decision.href, 'http://local.invalid');
    assert.equal(landed.searchParams.get('lente'), 'gerencia');
    assert.equal(landed.searchParams.get('datos'), 'demo');
    assert.equal(landed.searchParams.get('story'), null);
  });

  it('pushes when the pathname changes', () => {
    const decision = samePathQueryNavigation(
      '/clientes/p?datos=demo',
      '/clientes/p/oportunidades/nueva?datos=demo',
    );
    assert.equal(decision.kind, 'push');
    assert.equal(decision.href, '/clientes/p/oportunidades/nueva?datos=demo');
  });

  it('keeps explicit real on a same-path query change', () => {
    const next = withExplicitDataMode('/clientes/p?tab=historial', 'real');
    const decision = samePathQueryNavigation('/clientes/p?datos=real', next);
    assert.equal(decision.kind, 'assign');
    assert.equal(decision.href, '/clientes/p?tab=historial&datos=real');
    assert.equal(new URL(decision.href, 'http://local.invalid').searchParams.get('datos'), 'real');
  });

  it('does not navigate when pathname, search, and hash already match', () => {
    assert.equal(
      samePathQueryNavigation('/inicio?datos=demo', '/inicio?datos=demo').kind,
      'none',
    );
  });
});
