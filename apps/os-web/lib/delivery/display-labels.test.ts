import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isPilotFacingHidden,
  presentEntregaAuditLabel,
  presentLineDescription,
  presentPilotFacingLabel,
} from './display-labels';

describe('presentEntregaAuditLabel', () => {
  it('maps employee_recorded without exposing the audit token', () => {
    assert.equal(presentEntregaAuditLabel('employee_recorded'), 'Registrado por colaborador');
  });

  it('hides FINALV1 and SYNTH Wave2 fixture strings', () => {
    assert.equal(presentEntregaAuditLabel('FINALV1-ORDER-1'), 'Registro interno');
    assert.equal(presentEntregaAuditLabel('SYNTH Wave2 Cliente'), 'Registro interno');
    assert.equal(isPilotFacingHidden('SYNTH Wave2 Cliente'), true);
    assert.equal(isPilotFacingHidden('FINALV1-LINE'), true);
  });

  it('hides raw UUID member ids', () => {
    assert.equal(
      presentPilotFacingLabel('0f3da8a7-6d31-4e36-8f45-41331e6f5731'),
      'Colaborador',
    );
  });

  it('keeps ordinary commercial copy', () => {
    assert.equal(presentEntregaAuditLabel('DEMO FERRETERÍA NORTE'), 'DEMO FERRETERÍA NORTE');
    assert.equal(presentLineDescription('Sanitario Capri'), 'Sanitario Capri');
    assert.equal(presentLineDescription('FINALV1-sku-x'), 'Artículo');
  });
});
