import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dataModeForRedirect, explicitDataMode, isNavigableAppHref, samePathQueryNavigation, withExplicitDataMode } from './preserve-data-mode';

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

describe('isNavigableAppHref', () => {
  const origin = 'https://os-web-staging.onrender.com';

  it('leaves blob downloads alone so they are not pushed as a UUID page', () => {
    const blob = 'blob:https://os-web-staging.onrender.com/ead34868-ec21-4096-84f5-77aeb6d7121d';
    assert.equal(isNavigableAppHref(blob, origin), false);
    const parsed = new URL(blob);
    assert.equal(parsed.origin, origin);
    assert.match(parsed.pathname, /ead34868-ec21-4096-84f5-77aeb6d7121d/);
  });

  it('leaves PDF API routes and data URLs alone', () => {
    assert.equal(isNavigableAppHref('/api/quotes/q1/pdf', origin), false);
    assert.equal(isNavigableAppHref('/api/delivery-notes/n1/pdf?disposition=inline', origin), false);
    assert.equal(isNavigableAppHref('data:application/pdf;base64,JVBE', origin), false);
  });

  it('still stamps ordinary in-app links', () => {
    assert.equal(isNavigableAppHref('/clientes/p/cotizaciones/q1', origin), true);
    assert.equal(isNavigableAppHref('https://example.test/clientes/p', origin), false);
    assert.equal(isNavigableAppHref('#envio', origin), false);
  });
});
