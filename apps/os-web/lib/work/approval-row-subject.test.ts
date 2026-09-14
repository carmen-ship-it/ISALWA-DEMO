import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { APPROVAL_ROW_SUBJECT_FALLBACK, approvalRowSubject } from './approval-row-subject';

describe('approval row subject', () => {
  it('distinguishes two quotes and never emits a raw scope key', () => {
    const first = approvalRowSubject({
      subjectType: 'quote',
      quoteNumber: 'Q-000001',
      customerName: 'ASTRIX',
    });
    const second = approvalRowSubject({
      subjectType: 'quote',
      quoteNumber: 'Q-000026',
      customerName: 'IMPORTAMEC',
    });

    assert.notEqual(first, second);
    assert.equal(first, 'Cotización Q-000001 · ASTRIX');
    assert.equal(second, 'Cotización Q-000026 · IMPORTAMEC');

    const leaked = approvalRowSubject({
      subjectType: 'quote',
      quoteNumber: 'approval.act',
      customerName: 'commercial.team.read',
    });
    assert.equal(leaked, APPROVAL_ROW_SUBJECT_FALLBACK);
    assert.doesNotMatch(leaked, /approval\.act|commercial\.team\.read|commercial\.org\.read/);
    assert.doesNotMatch(`${first}\n${second}`, /approval\.act|commercial\.[a-z]/);
  });

  it('fails closed when the number or customer is missing', () => {
    assert.equal(
      approvalRowSubject({ subjectType: 'quote', quoteNumber: 'Q-000001' }),
      APPROVAL_ROW_SUBJECT_FALLBACK,
    );
    assert.equal(
      approvalRowSubject({ subjectType: 'quote', customerName: 'ASTRIX' }),
      APPROVAL_ROW_SUBJECT_FALLBACK,
    );
    assert.equal(
      approvalRowSubject({ subjectType: 'order', orderNumber: 'PED-12' }),
      APPROVAL_ROW_SUBJECT_FALLBACK,
    );
    assert.equal(
      approvalRowSubject({ subjectType: 'commercial.team.read', quoteNumber: 'Q-1', customerName: 'ASTRIX' }),
      APPROVAL_ROW_SUBJECT_FALLBACK,
    );
  });
});
