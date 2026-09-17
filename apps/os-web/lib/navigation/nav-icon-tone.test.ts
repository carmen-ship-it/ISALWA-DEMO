import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { navIconTone, navIconToneActive } from './nav-icon-tone';

describe('nav icon category tones', () => {
  it('keeps commercial navy+sky and ops teal', () => {
    const commercial = navIconTone({ id: 'clientes', group: 'comercial' });
    assert.match(commercial.chip, /sky-100/);
    assert.match(commercial.ink, /kiln/);

    const ops = navIconTone({ id: 'produccion', group: 'operaciones' });
    assert.match(ops.chip, /teal-100/);
    assert.match(ops.ink, /glaze-deep/);
  });

  it('overrides map/data-health/issues without rainbow', () => {
    const map = navIconTone({ id: 'mapa', group: 'comercial' });
    assert.match(map.chip, /sky-100/);
    assert.match(map.ink, /glaze-deep/);

    const health = navIconTone({ id: 'salud-datos', group: 'comercial' });
    assert.match(health.chip, /teal-100/);

    const issues = navIconTone({ id: 'incidencias', group: 'trabajo' });
    assert.match(issues.ink, /kiln/);
    assert.match(issues.chip, /warning|sky-100/);
  });

  it('active tone stays teal/sky + glaze ink', () => {
    const active = navIconToneActive();
    assert.match(active.chip, /glaze|sky-100/);
    assert.match(active.ink, /glaze-deep/);
  });
});
