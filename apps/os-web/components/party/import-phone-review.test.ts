import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OsApiError } from '@/lib/api/os-api-errors';
import {
  buildResolveImportPhonePayload,
  importPhoneActionLabel,
  importPhoneCommandMessage,
  importPhoneReviewSummary,
} from '@/components/party/import-phone-review';

const summary = {
  country: 'BO' as const,
  countrySource: 'default' as const,
  accepted: 0,
  invalid: 1,
  corrected: 0,
  omitted: 2,
  extraNotImported: 0,
  rowsNeedingCorrection: 1,
  code: null,
  correctionCode: 'PHONE_CORRECTION_REQUIRED' as const,
  items: [],
};

describe('T03 import phone review', () => {
  it('shows every count and marks the default country', () => {
    const view = importPhoneReviewSummary(summary);
    assert.match(view.country, /predeterminado/);
    assert.deepEqual(
      view.counts.map(([, count]) => count),
      [0, 1, 0, 2, 0, 1],
    );
    assert.equal(importPhoneActionLabel('import_without_number'), 'Importado sin este número');
  });

  it('correct needs a number and a reason; omit does not send a number', () => {
    const base = { importBatchId: 'b1', rowIndex: 3, valueId: 'celular:0', expectedVersion: 1, reason: 'Número de la ficha' };
    assert.equal(buildResolveImportPhonePayload({ ...base, decision: 'correct', correctedNumber: ' ' }).ok, false);
    assert.equal(buildResolveImportPhonePayload({ ...base, decision: 'omit', reason: 'corto' }).ok, false);
    const omitted = buildResolveImportPhonePayload({ ...base, decision: 'omit', correctedNumber: '70001111' });
    assert.equal(omitted.ok && 'correctedNumber' in omitted.payload, false);
    const corrected = buildResolveImportPhonePayload({ ...base, decision: 'correct', correctedNumber: ' 71111456 ' });
    assert.equal(corrected.ok && corrected.payload.correctedNumber, '71111456');
  });

  it('names the import refusals and a possible duplicate', () => {
    const conflict = (code: string) => new OsApiError({ kind: 'conflict', status: 409, code, message: 'x' });
    assert.match(importPhoneCommandMessage(conflict('IMPORT_PHONE_REVIEW_REQUIRED')), /pendientes/);
    assert.match(importPhoneCommandMessage(conflict('IMPORT_DRY_RUN_OUTDATED')), /ensayar/);
    assert.equal(importPhoneCommandMessage(null, 'CORRECTED_PHONE_MATCH'), 'Posible duplicado para revisar.');
  });
});
