import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OsApiError } from '@/lib/api/os-api-errors';
import {
  buildReportCorrectionPayload,
  buildResolveCorrectionPayload,
  correctionCommandMessage,
  CORRECTION_STATE_LABELS,
} from '@/components/issue/correction-request';

describe('T03 correction requests', () => {
  it('uses the four labels and refuses payment, quote, order and document fields', () => {
    assert.deepEqual(
      [CORRECTION_STATE_LABELS.pending, CORRECTION_STATE_LABELS.in_review, CORRECTION_STATE_LABELS.applied, CORRECTION_STATE_LABELS.rejected],
      ['Pendiente', 'En revisión', 'Resuelta', 'Rechazada'],
    );
    assert.equal(buildReportCorrectionPayload({ description: 'x', partyId: 'p', field: 'payment', proposedValue: '1', source: 'staff' }).ok, false);
    assert.equal(buildReportCorrectionPayload({ description: 'x', partyId: 'p', field: 'quote', proposedValue: '1', source: 'staff' }).ok, false);
  });

  it('applied cites an event and rejected does not; a differing value asks for an explanation', () => {
    assert.equal(
      buildResolveCorrectionPayload({ issueId: 'i', expectedVersion: 1, decision: 'applied', reason: 'Cambio ya registrado en la ficha' }).ok,
      false,
    );
    const rejected = buildResolveCorrectionPayload({
      issueId: 'i',
      expectedVersion: 1,
      decision: 'rejected',
      reason: 'El dato ya era el correcto',
      eventId: 'should-drop',
    });
    assert.equal(rejected.ok && 'appliedEventId' in (rejected.payload.correction as object), false);
    const differs = correctionCommandMessage(new OsApiError({ kind: 'unknown', status: 409, code: 'CORRECTION_VALUE_DIFFERS', message: 'x' }));
    assert.equal(differs.code, 'CORRECTION_VALUE_DIFFERS');
    assert.match(correctionCommandMessage(new OsApiError({ kind: 'unknown', status: 409, code: 'CORRECTION_EVIDENCE_INVALID', message: 'x' })).error, /no corresponde/);
  });
});
