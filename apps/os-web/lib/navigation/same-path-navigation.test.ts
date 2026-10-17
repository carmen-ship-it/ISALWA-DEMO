import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isNavigableAppHref, samePathQueryNavigation } from './same-path-navigation';

describe('samePathQueryNavigation', () => {
  it('assigns a same-path tab change and keeps the tab', () => {
    const decision = samePathQueryNavigation('/clientes/p', '/clientes/p?tab=historial');
    assert.equal(decision.kind, 'assign');
    assert.equal(decision.href, '/clientes/p?tab=historial');
    assert.equal(new URL(decision.href, 'http://local.invalid').searchParams.get('tab'), 'historial');
  });

  it('assigns a same-path lente change and does not require story on the destination', () => {
    const decision = samePathQueryNavigation('/inicio?story=1', '/inicio?lente=gerencia');
    assert.equal(decision.kind, 'assign');
    assert.equal(decision.href, '/inicio?lente=gerencia');
    const landed = new URL(decision.href, 'http://local.invalid');
    assert.equal(landed.searchParams.get('lente'), 'gerencia');
    assert.equal(landed.searchParams.get('story'), null);
  });

  it('pushes when the pathname changes', () => {
    const decision = samePathQueryNavigation('/clientes/p', '/clientes/p/oportunidades/nueva');
    assert.equal(decision.kind, 'push');
    assert.equal(decision.href, '/clientes/p/oportunidades/nueva');
  });

  it('does not navigate when pathname, search, and hash already match', () => {
    assert.equal(samePathQueryNavigation('/inicio?lente=gerencia', '/inicio?lente=gerencia').kind, 'none');
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

  it('accepts ordinary in-app links only', () => {
    assert.equal(isNavigableAppHref('/clientes/p/cotizaciones/q1', origin), true);
    assert.equal(isNavigableAppHref('https://example.test/clientes/p', origin), false);
    assert.equal(isNavigableAppHref('#envio', origin), false);
  });
});
