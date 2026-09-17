import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DataHealthIssue } from './data-health';
import { dataHealthCta } from './data-health-cta';

function issue(id: string): DataHealthIssue {
  return {
    id,
    type: 'revision',
    status: 'hallazgo',
    title: 'Test',
    what: 'x',
    why: 'y',
    action: 'z',
    boundary: 'b',
  };
}

describe('dataHealthCta', () => {
  it('routes known issue ids without auto-fix language', () => {
    assert.deepEqual(dataHealthCta(issue('missing-phone')), {
      href: '/clientes',
      label: 'Revisar clientes',
    });
    assert.deepEqual(dataHealthCta(issue('missing-location')), {
      href: '/mapa',
      label: 'Abrir mapa',
    });
    assert.deepEqual(dataHealthCta(issue('unassigned')), {
      href: '/clientes',
      label: 'Asignar en clientes',
    });
  });

  it('routes shared provenance clusters to clientes', () => {
    assert.deepEqual(dataHealthCta(issue('shared-provenance:abc')), {
      href: '/clientes',
      label: 'Revisar en clientes',
    });
  });
});
