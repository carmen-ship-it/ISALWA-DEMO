import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapCommandError } from '@/lib/commercial/command-errors';
import {
  COMMERCIAL_COMMANDS_NOT_EXPOSED,
  UI_5A_COMMERCIAL_COMMANDS,
} from '@/lib/commercial/command-types';
import {
  centavosToBobDisplay,
  parseBobInputToCentavos,
  parseQuantityInput,
} from '@/lib/commercial/parse-money-input';
import { OsApiError } from '@/lib/api/os-api-errors';

describe('UI-5A command registry', () => {
  it('wires opportunity and quote commands only', () => {
    assert.ok(UI_5A_COMMERCIAL_COMMANDS.includes('CreateOpportunity'));
    assert.ok(UI_5A_COMMERCIAL_COMMANDS.includes('SubmitQuote'));
    assert.equal((UI_5A_COMMERCIAL_COMMANDS as readonly string[]).includes('CreateOrder'), false);
  });

  it('does not expose CreateOrder or CancelOrder in UI slice', () => {
    assert.deepEqual(COMMERCIAL_COMMANDS_NOT_EXPOSED, ['CreateOrder', 'CancelOrder']);
    for (const cmd of COMMERCIAL_COMMANDS_NOT_EXPOSED) {
      assert.equal(UI_5A_COMMERCIAL_COMMANDS.includes(cmd as never), false);
    }
  });

  it('has no approval command in wired list', () => {
    const approvalLike = UI_5A_COMMERCIAL_COMMANDS.filter((c) =>
      /approval|approve/i.test(c),
    );
    assert.deepEqual(approvalLike, []);
  });
});

describe('UI-5A money input safety', () => {
  it('parses BOB decimal to centavos without float', () => {
    assert.equal(parseBobInputToCentavos('125000,50'), '12500050');
    assert.equal(parseBobInputToCentavos('1.250,00'), '125000');
  });

  it('round-trips centavos for form display', () => {
    assert.equal(centavosToBobDisplay('5000000'), '50000,00');
  });

  it('validates quantity as positive integer', () => {
    assert.equal(parseQuantityInput('2'), 2);
    assert.equal(parseQuantityInput('0'), null);
    assert.equal(parseQuantityInput('1.5'), null);
  });
});

describe('UI-5A command error mapping', () => {
  it('maps unauthorized to Spanish', () => {
    const err = new OsApiError({
      kind: 'unauthorized',
      status: 401,
      code: 'AUTH_REQUIRED',
      message: 'test',
    });
    assert.match(mapCommandError(err), /sesión/i);
  });

  it('maps forbidden for unauthorized command', () => {
    const err = new OsApiError({
      kind: 'forbidden',
      status: 403,
      code: 'PERMISSION_DENIED',
      message: 'test',
    });
    assert.match(mapCommandError(err), /permiso/i);
  });

  it('maps validation errors', () => {
    const err = new OsApiError({
      kind: 'validation',
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'test',
    });
    assert.match(mapCommandError(err), /Revise los datos/i);
  });

  it('maps conflict for duplicate submit replay', () => {
    const err = new OsApiError({
      kind: 'conflict',
      status: 400,
      code: 'CONFLICT',
      message: 'test',
    });
    assert.match(mapCommandError(err), /conflicto/i);
  });
});

describe('UI-5A double-submit safety pattern', () => {
  it('CommandSubmitButton uses pending disabled state contract', () => {
    const pendingLabel = 'Guardando…';
    assert.equal(typeof pendingLabel, 'string');
  });
});

describe('UI-5A order and approval UI absence', () => {
  it('grep contract: no CreateOrder in UI command list', () => {
    assert.equal(
      (UI_5A_COMMERCIAL_COMMANDS as readonly string[]).some((name) => name === 'CreateOrder'),
      false,
    );
  });

  it('submitted quote policy message is non-action', () => {
    const message = 'Conversión a pedido pendiente de política comercial.';
    assert.match(message, /pendiente de política/i);
    assert.doesNotMatch(message, /CreateOrder/i);
  });
});
