import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { daypartGreeting, greetingLine, usableGivenName } from './greeting';

function atUtc(iso: string): Date {
  return new Date(iso);
}

describe('America/La_Paz daypart greeting', () => {
  it('uses Buenos días from 05:00 through 11:59', () => {
    assert.equal(daypartGreeting(atUtc('2026-01-15T09:00:00.000Z')), 'Buenos días');
    assert.equal(daypartGreeting(atUtc('2026-01-15T15:59:00.000Z')), 'Buenos días');
  });

  it('uses Buenas tardes from 12:00 through 18:59', () => {
    assert.equal(daypartGreeting(atUtc('2026-01-15T16:00:00.000Z')), 'Buenas tardes');
    assert.equal(daypartGreeting(atUtc('2026-01-15T22:59:00.000Z')), 'Buenas tardes');
  });

  it('uses Buenas noches from 19:00 through 04:59', () => {
    assert.equal(daypartGreeting(atUtc('2026-01-15T23:00:00.000Z')), 'Buenas noches');
    assert.equal(daypartGreeting(atUtc('2026-01-15T08:59:00.000Z')), 'Buenas noches');
  });

  it('greets with the given name and omits a name when there is none', () => {
    const morning = atUtc('2026-01-15T13:00:00.000Z');
    assert.equal(greetingLine('Isabela', morning), 'Buenos días, Isabela');
    assert.equal(greetingLine('  Álvaro  ', morning), 'Buenos días, Álvaro');
    assert.equal(greetingLine(null, morning), 'Buenos días');
    assert.equal(greetingLine('   ', morning), 'Buenos días');
    assert.equal(greetingLine(undefined, morning).includes(','), false);
  });

  it('does not treat an email as a human name', () => {
    const afternoon = atUtc('2026-01-15T18:00:00.000Z');
    assert.equal(usableGivenName('isabela@isalwa.bo'), null);
    assert.equal(usableGivenName(' name@host '), null);
    assert.equal(greetingLine('isabela@isalwa.bo', afternoon), 'Buenas tardes');
    assert.equal(greetingLine('isabela@isalwa.bo', afternoon).includes('@'), false);
  });
});

describe('greeting reaches Inicio through the shell', () => {
  it('loads givenName from getMember and does not greet from the session label', () => {
    const shell = readFileSync(resolve('lib/shell/load-shell-context.ts'), 'utf8');
    const page = readFileSync(resolve('app/(app)/inicio/page.tsx'), 'utf8');
    const layout = readFileSync(resolve('app/(app)/layout.tsx'), 'utf8');

    assert.match(shell, /session\.memberId/);
    assert.match(shell, /getMember\(memberId\)/);
    assert.match(shell, /usableGivenName\(member\.summary\.givenName\)/);
    assert.doesNotMatch(shell, /usableGivenName\([^)]*displayLabel/);
    assert.match(layout, /givenName=\{shell\.givenName\}/);
    assert.match(page, /greetingLine\(shellContext\?\.givenName\)/);
    assert.doesNotMatch(page, /greetingLine\([^)]*displayLabel/);
    assert.doesNotMatch(page, /greetingLine\([^)]*email/);
  });

  it('keeps the executive labels and demo activation copy separate from live totals', () => {
    const lens = readFileSync(resolve('components/commercial/executive-lens.tsx'), 'utf8');
    const demo = readFileSync(resolve('components/commercial/demo-preview-cards.tsx'), 'utf8');

    assert.match(lens, /Valor cotizado/);
    assert.match(lens, /Valor de pedidos/);
    assert.match(lens, /Oportunidades activas/);
    assert.doesNotMatch(lens, /Ingresos|Revenue|Ventas cobradas/);
    assert.match(demo, /COBRANZA/);
    assert.match(demo, /DESPACHOS/);
    assert.match(demo, /INVENTARIO/);
    assert.match(demo, /PRODUCCIÓN/);
    assert.match(demo, /INGRESOS COBRADOS/);
    assert.match(
      demo,
      /Se activará con información real cuando conectemos ISALWA al sistema o fuente donde hoy registran pagos y cobranzas\./,
    );
    assert.match(
      demo,
      /Se activará con datos reales cuando conectemos ISALWA al sistema de despacho o logística\./,
    );
    assert.match(
      demo,
      /Se activará cuando conectemos el sistema donde controlan stock y movimientos de almacén\./,
    );
    assert.match(demo, /Se activará cuando conectemos la información real de producción\./);
    assert.match(demo, /Se activará cuando conectemos la fuente oficial de ventas y cobranza\./);
    assert.doesNotMatch(demo, /href=|onClick|Bs\./);
  });
});
