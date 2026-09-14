import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createReportedOperationalFact,
  manualFactsSummary,
  reportedFactConfirmation,
  reportedFactCopy,
  reverseReportedFact,
  type CreateReportedFactInput,
} from './reported-fact';

const FORBIDDEN = [
  /\bcobrado\b/i,
  /\bpagado\b/i,
  /\bingreso\b/i,
  /pago confirmado/i,
  /pagado confirmado/i,
  /disponibilidad/i,
];

function draft(patch: Partial<CreateReportedFactInput> = {}): CreateReportedFactInput {
  return {
    id: 'fact-synthetic-1',
    organizationId: 'org-synthetic',
    subjectType: 'party',
    subjectId: 'party-synthetic-not-imported',
    reportedAt: '2026-09-14T14:30:00.000Z',
    reportedByLabel: 'Operador de prueba',
    kind: 'payment',
    amountCentavos: '450000',
    ...patch,
  } as CreateReportedFactInput;
}

function joinedCopy(input: CreateReportedFactInput): string {
  const copy = reportedFactCopy(createReportedOperationalFact(input));
  return JSON.stringify(copy);
}

describe('reported operational fact', () => {
  it('keeps a payment report manual and pending', () => {
    const fact = createReportedOperationalFact(draft());
    const copy = reportedFactCopy(fact);

    assert.equal(fact.source, 'manual');
    assert.equal(fact.confirmation, 'pending');
    assert.equal(reportedFactConfirmation(fact), 'pending');
    assert.equal(copy.title, 'Pago reportado');
    assert.equal(copy.value, 'Bs. 4.500,00');
    assert.equal(copy.confirmation, 'Pendiente de confirmar');
    assert.equal(copy.source, 'Fuente: registro manual');
    assert.equal(copy.recordedBy, 'Registrado por Operador de prueba');
    assert.equal(copy.manualLabel, 'Dato manual');
    assert.equal(copy.automation, 'Se automatizará cuando conectemos cobranza.');
    assert.equal('latitude' in fact, false);
    assert.equal('confirmedAt' in fact, false);
    for (const pattern of FORBIDDEN) {
      assert.equal(pattern.test(JSON.stringify(copy)), false);
    }
  });

  it('does not accept source or confirmation as inputs', () => {
    const fact = createReportedOperationalFact({
      ...draft(),
      ...({ source: 'ledger', confirmation: 'confirmed' } as object),
    });

    assert.equal(fact.source, 'manual');
    assert.equal(fact.confirmation, 'pending');
    assert.equal(fact.kind, 'payment');
    if (fact.kind === 'payment') assert.equal(fact.amountCentavos, '450000');
  });

  it('shows a dispatch report as manual text, not official logistics', () => {
    const copy = reportedFactCopy(
      createReportedOperationalFact(
        draft({
          kind: 'dispatch',
          reportedState: 'Despachado',
        }),
      ),
    );

    assert.equal(copy.title, 'Despacho reportado');
    assert.equal(copy.value, 'Despachado');
    assert.equal(copy.manualLabel, 'Dato manual');
    assert.equal(copy.confirmation, 'Pendiente de confirmar');
    assert.match(copy.automation, /despacho\/logística/);
    assert.doesNotMatch(copy.automation, /oficial/);
  });

  it('shows stock as a manual snapshot, not availability', () => {
    const copy = reportedFactCopy(
      createReportedOperationalFact(
        draft({
          kind: 'stock',
          itemLabel: 'Ítem de prueba',
          quantity: '43',
        }),
      ),
    );

    assert.equal(copy.title, 'Stock reportado');
    assert.equal(copy.value, '43 unidades');
    assert.equal(copy.provenanceLine, 'Stock reportado manualmente');
    assert.equal(copy.confirmation, 'Pendiente de confirmar');
    assert.match(copy.automation, /almacén\/inventario/);
    assert.equal(/disponibilidad/i.test(joinedCopy(draft({ kind: 'stock', itemLabel: 'Ítem', quantity: '43' }))), false);
  });

  it('reverses the report without rewriting the value or confirming it', () => {
    const original = createReportedOperationalFact(draft({ note: 'Cliente informa pago' }));
    const reversed = reverseReportedFact(original, 'Cifra equivocada');

    assert.equal(original.activity, 'active');
    assert.equal(original.note, 'Cliente informa pago');
    assert.equal(reversed.activity, 'reversed');
    assert.equal(reversed.source, 'manual');
    assert.equal(reversed.confirmation, 'pending');
    assert.equal(reversed.reversalReason, 'Cifra equivocada');
    if (original.kind === 'payment' && reversed.kind === 'payment') {
      assert.equal(reversed.amountCentavos, original.amountCentavos);
    }
    assert.equal(reportedFactCopy(reversed).reversal, 'Registro anulado. No confirma el hecho.');
    assert.throws(() => reverseReportedFact(reversed, 'otra vez'), /not overwritten/);
  });

  it('rejects a ledger-shaped amount, a stock movement, and an empty dispatch state', () => {
    assert.throws(() => createReportedOperationalFact(draft({ amountCentavos: '-100' })), /ledger/);
    assert.throws(() => createReportedOperationalFact(draft({ amountCentavos: '0' })), /positive/);
    assert.throws(
      () => createReportedOperationalFact(draft({ kind: 'stock', itemLabel: 'Ítem', quantity: '1.5' })),
      /snapshot/,
    );
    assert.throws(
      () => createReportedOperationalFact(draft({ kind: 'dispatch', reportedState: '   ' })),
      /reportedState/,
    );
  });

  it('does not invent reports when none were given', () => {
    assert.equal(manualFactsSummary([]), 'No hay datos manuales reportados.');
    const one = createReportedOperationalFact(draft());
    assert.equal(manualFactsSummary([one]), '1 dato manual. Pendiente de confirmar.');
  });
});
