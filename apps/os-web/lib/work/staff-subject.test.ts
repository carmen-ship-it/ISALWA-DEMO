import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { overdueAttention, sampleAttention } from './fixtures';
import {
  approvalStaffSubject,
  attentionStaffSubject,
  isEngineeringFixtureCopy,
  staffFacingSubject,
} from './staff-subject';

describe('staff-facing subjects', () => {
  it('does not present engineering fixture titles', () => {
    assert.equal(isEngineeringFixtureCopy('CC3ORD-mu08fc5t-quote'), true);
    assert.equal(isEngineeringFixtureCopy('CC4-mu08fc5t-quote-followup'), true);
    assert.equal(isEngineeringFixtureCopy('WB-ISSUE-PAL-001'), true);
    assert.equal(isEngineeringFixtureCopy('Wave B Close Test'), true);
    assert.equal(isEngineeringFixtureCopy('probe commitment'), true);
    assert.equal(isEngineeringFixtureCopy('Cliente Step17 norte'), true);
    assert.equal(isEngineeringFixtureCopy('RC4-DISC follow-up'), true);
    assert.equal(isEngineeringFixtureCopy('WB Close batch'), true);
    assert.equal(isEngineeringFixtureCopy('CW 12 checkout'), true);
    assert.equal(isEngineeringFixtureCopy('manual-opp seed'), true);
    assert.equal(isEngineeringFixtureCopy('AUTHORITATIVE_REVENUE_LAYER=NO'), true);
    assert.equal(isEngineeringFixtureCopy('mu5wx57g trace'), true);
    assert.equal(isEngineeringFixtureCopy('PRUEBA ÁLVARO — recorrido'), false);
    assert.equal(
      staffFacingSubject({
        title: 'CC3ORD-mu08fc5t-x',
        subjectType: 'party',
        customerName: 'ALVAREZ',
      }),
      'Cliente · ALVAREZ',
    );
  });

  it('keeps a human title and does not use Vencido as the subject', () => {
    assert.equal(staffFacingSubject({ title: 'Confirmar entrega', customerName: 'VAINSA' }), 'Confirmar entrega · VAINSA');
    const overdueWithoutTitle = {
      ...overdueAttention,
      reasonDetail: { source: 'work_read_model', dueAt: '2026-01-01T00:00:00.000Z' },
    };
    assert.equal(
      attentionStaffSubject(overdueWithoutTitle, { customerName: 'GARCIA' }),
      'Cliente · GARCIA',
    );
    assert.doesNotMatch(attentionStaffSubject(overdueWithoutTitle, { customerName: 'GARCIA' }), /^Vencido$/);
  });

  it('keeps a stored human attention title', () => {
    assert.equal(attentionStaffSubject(sampleAttention), 'Seguimiento cliente ABC');
  });

  it('identifies a quote approval from existing number and customer', () => {
    assert.equal(
      approvalStaffSubject({
        subjectType: 'quote',
        quoteNumber: 'Q-000026',
        customerName: 'IMPORTAMEC',
      }),
      'Cotización Q-000026 · IMPORTAMEC',
    );
    assert.notEqual(
      approvalStaffSubject({ subjectType: 'quote', quoteNumber: 'Q-000001', customerName: 'ASTRIX' }),
      approvalStaffSubject({ subjectType: 'quote', quoteNumber: 'Q-000026', customerName: 'IMPORTAMEC' }),
    );
  });
});
