import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { partyUpdateSummary, timelineEntrySummary } from '@/lib/commercial/timeline-labels';
import {
  buildUpdatePartyPayload,
  parsePartyChangeKind,
  partyEditReasonError,
} from '@/lib/party/customer-self-service';

const previous = { displayName: 'Andina', legalName: 'Andina SRL' };

describe('T03 customer edit with reason and field history (A2 §46)', () => {
  it('asks for a reason for any name or legal-name change, typos included', () => {
    const base = { previous, displayName: 'Andinaa', legalName: 'Andina SRL', changeReason: '' };
    for (const changeKind of ['update', 'correction', 'typo'] as const) {
      assert.equal(partyEditReasonError({ ...base, changeKind }), 'Indique el motivo del cambio.', changeKind);
    }
    assert.equal(partyEditReasonError({ ...base, displayName: 'Andina', legalName: 'Andina S.R.L.', changeKind: 'typo' }), 'Indique el motivo del cambio.');
    assert.equal(partyEditReasonError({ ...base, changeKind: 'update', changeReason: 'Cambió de nombre' }), null);
    assert.equal(partyEditReasonError({ ...base, displayName: 'Andina', changeKind: 'update' }), null, 'nothing changed');
  });

  it('sends kind and trimmed reason; unknown kinds fall back to update', () => {
    assert.equal(parsePartyChangeKind('typo'), 'typo');
    assert.equal(parsePartyChangeKind('delete'), 'update');
    assert.deepEqual(
      buildUpdatePartyPayload({ partyId: 'p1', displayName: 'Andina', expectedVersion: 2, changeKind: 'correction', changeReason: '  Mal registrado ' }),
      { partyId: 'p1', displayName: 'Andina', expectedVersion: 2, changeKind: 'correction', changeReason: 'Mal registrado' },
    );
    assert.equal('changeReason' in buildUpdatePartyPayload({ partyId: 'p1', displayName: 'A', expectedVersion: 0, changeReason: '  ' }), false);
  });

  it('history shows old and new values, kind, reason and version; older entries say they have no detail', () => {
    assert.equal(
      partyUpdateSummary({
        displayName: 'Andina Construcciones',
        previousDisplayName: 'Andina',
        legalName: 'Andina SRL',
        previousLegalName: null,
        changedFields: 'displayName,legalName',
        changeKind: 'correction',
        reason: 'Se registró con otro nombre',
        version: 4,
      }),
      'Nombre: Andina → Andina Construcciones · Razón social: — → Andina SRL · Corrección · Motivo: Se registró con otro nombre · Versión 4',
    );
    assert.equal(partyUpdateSummary({ displayName: 'Andina' }), 'Nombre: Andina · Cambio anterior sin detalle');
    assert.equal(
      timelineEntrySummary({
        eventType: 'party.updated',
        facts: { changedFields: 'displayName', previousDisplayName: 'Andna', displayName: 'Andina', changeKind: 'typo', reason: null, version: 2 },
      } as never),
      'Nombre: Andna → Andina · Error de escritura · Versión 2',
    );
  });
});

describe('T03 timeline summary entries (contract C2)', () => {
  const entry = (eventType: string, facts: Record<string, string | number>) =>
    ({
      entryId: 'e1',
      organizationId: 'org',
      partyId: 'p1',
      eventType,
      occurredAt: '2026-10-18T12:00:00.000Z',
      actorMemberId: 'm1',
      correlationId: 'c1',
      primaryEntityType: 'party',
      primaryEntityId: 'p1',
      facts,
      detail: 'summary' as const,
    });

  it('says what changed without values, names or reason text', () => {
    const renamed = timelineEntrySummary(entry('party.updated', { partyId: 'p1', changedFields: 'displayName,legalName', version: 3 }));
    assert.equal(renamed, 'Cambió: Nombre, Razón social · Versión 3 · Detalle visible para quien puede editar este cliente');
    assert.doesNotMatch(renamed, /—|→|Motivo/);
    const phone = timelineEntrySummary(entry('contact.phone.changed', { partyId: 'p1', contactId: 'c1', reason: 'number_changed', version: 2 }));
    assert.match(phone, /^Número de contacto cambiado · Motivo: /);
    assert.doesNotMatch(phone, /→|Verificación/);
  });
});
