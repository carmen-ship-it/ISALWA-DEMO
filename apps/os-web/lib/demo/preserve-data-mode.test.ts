import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { explicitDataMode, hrefWithClientDataMode, withExplicitDataMode } from './preserve-data-mode';
import { redirectKeepingDataMode } from './redirect-data-mode';

describe('retired data-mode compat helpers', () => {
  it('never recognise a mode from a URL value', () => {
    assert.equal(explicitDataMode('demo'), null);
    assert.equal(explicitDataMode('real'), null);
    assert.equal(explicitDataMode(null), null);
  });

  it('pass hrefs through unchanged', () => {
    for (const href of ['/clientes/p?tab=historial', '/inicio', '/aprobaciones/a#nota']) {
      assert.equal(withExplicitDataMode(href, explicitDataMode('demo')), href);
      assert.equal(hrefWithClientDataMode(href), href);
    }
  });

  it('post-create redirects ignore a submitted mode field', async () => {
    const form = new FormData();
    form.set('datos', 'demo');
    assert.equal(await redirectKeepingDataMode('/clientes/p', form), '/clientes/p');
  });
});
