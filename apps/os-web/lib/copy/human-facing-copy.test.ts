import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { demoPersonCargo, presentHumanCopy } from './human-facing-copy';

describe('pilot display cleanup', () => {
  it('strips the demo marker without rewriting the rest of the title', () => {
    assert.equal(presentHumanCopy('[is_demo] Seguimiento reposición'), 'Seguimiento reposición');
    assert.equal(presentHumanCopy('Pago [IS_DEMO] pendiente'), 'Pago pendiente');
  });

  it('maps fixture personnel to the demo set and hides leftover synth/waveb tokens', () => {
    assert.equal(presentHumanCopy('Synth Gerente'), 'Diego Demo');
    assert.equal(presentHumanCopy('Synth Almacen'), 'María Demo');
    assert.equal(presentHumanCopy('WaveB IssueManager'), 'Carlos Demo');
    assert.equal(presentHumanCopy('WaveB IssueWork'), 'José Demo');
    assert.equal(presentHumanCopy('Synth Otro'), 'Equipo Demo');
    assert.equal(presentHumanCopy('Wave2 fixture batch'), 'Equipo Demo');
    assert.equal(demoPersonCargo('Synth Gerente'), 'Gerencia');
    assert.equal(demoPersonCargo('Carmen Staging'), null);
  });

  it('hides production-update markers and raw work references', () => {
    const raw = [
      'Se solicita el estado actual de producción para responder al cliente o al área comercial.',
      '',
      'Contexto: Pedido O-000004 (01M2PMGHWHT6WF044JDV4HEZVT)',
      '[[production-update:01M2PMGHWHT6WF044JDV4HEZVT]]',
    ].join('\n');
    const shown = presentHumanCopy(raw);
    assert.match(shown, /Se solicita el estado actual de producción/);
    assert.match(shown, /Contexto: Pedido O-000004$/);
    assert.equal(shown.includes('production-update'), false);
    assert.equal(shown.includes('01M2PMGHWHT6WF044JDV4HEZVT'), false);
    assert.equal(shown.includes('[['), false);
  });
});
