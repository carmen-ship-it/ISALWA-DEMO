import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  commercialOwnerLine,
  formatPersonWithCargo,
  humanizeCargoLabel,
  resolveCargoForDisplay,
} from './staff-display';

describe('staff-display', () => {
  it('humanizes known Cargo labels without granting authority', () => {
    assert.equal(humanizeCargoLabel('ASESOR DE VENTA'), 'Asesor de Venta');
    assert.equal(humanizeCargoLabel('JEFE COMERCIAL'), 'Jefe Comercial');
    assert.equal(humanizeCargoLabel('GERENTE GENERAL'), 'Gerente General');
  });

  it('rejects capability codes for user display', () => {
    assert.equal(humanizeCargoLabel('commercial.quote.convert.own'), null);
    assert.equal(humanizeCargoLabel('approval.act'), null);
  });

  it('prefers evidenced Cargo over department', () => {
    assert.equal(
      resolveCargoForDisplay({
        cargo: 'JEFE COMERCIAL',
        departmentName: 'Comercial',
        roleKeys: ['commercial.team.read'],
      }),
      'Jefe Comercial',
    );
  });

  it('formats person · cargo and pending commercial owner', () => {
    assert.equal(
      formatPersonWithCargo('EDWIN YAMIL CALERO VALDEZ', 'Jefe Comercial'),
      'EDWIN YAMIL CALERO VALDEZ · Jefe Comercial',
    );
    assert.match(commercialOwnerLine({ displayName: null, cargoLabel: null }), /pendiente de asignar/i);
    assert.match(
      commercialOwnerLine({
        displayName: 'YUSELKA JUSTINIANO DURAN',
        cargoLabel: 'Asesor de Venta',
      }),
      /Responsable comercial: YUSELKA JUSTINIANO DURAN · Asesor de Venta/,
    );
  });
});
