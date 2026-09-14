import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APPROVAL_ROW_SUBJECT_FALLBACK,
  approvalRowSubject,
  approvalSubjectsForItems,
} from './approval-row-subject';

const SUBJECT_ID = '01M2EPMK48PMBZHCYZSDT35Q55';

describe('approval row subject', () => {
  it('displays an authorized quote number and customer', () => {
    assert.equal(
      approvalRowSubject({
        subjectType: 'quote',
        subjectId: SUBJECT_ID,
        quoteNumber: 'Q-000026',
        customerName: 'IMPORTAMEC',
      }),
      'Cotización Q-000026 · IMPORTAMEC',
    );
  });

  it('displays an authorized order number and customer', () => {
    assert.equal(
      approvalRowSubject({
        subjectType: 'order',
        subjectId: SUBJECT_ID,
        orderNumber: 'O-000009',
        customerName: 'COMERCIAL ALVAREZ',
      }),
      'Pedido O-000009 · COMERCIAL ALVAREZ',
    );
  });

  it('keeps the document number when the customer name is not usable', () => {
    assert.equal(
      approvalRowSubject({
        subjectType: 'quote',
        subjectId: SUBJECT_ID,
        quoteNumber: 'Q-000010',
        customerName: 'ZZV1SMOKEmu0j7f8o-EDIT',
      }),
      'Cotización Q-000010',
    );
    assert.equal(
      approvalRowSubject({
        subjectType: 'quote',
        quoteNumber: 'Q-000015',
        customerName: 'Cliente',
      }),
      'Cotización Q-000015',
    );
  });

  it('uses a type word when the subject read is denied or missing', () => {
    assert.equal(
      approvalRowSubject({ subjectType: 'quote', subjectId: SUBJECT_ID }),
      'Cotización',
    );
    assert.equal(
      approvalRowSubject({ subjectType: 'order', subjectId: SUBJECT_ID, customerName: 'ASTRIX' }),
      'Pedido',
    );
    assert.equal(approvalRowSubject({ subjectType: 'quote', quoteNumber: null }), 'Cotización');
    assert.equal(approvalRowSubject({ subjectType: 'order', orderNumber: '' }), 'Pedido');
  });

  it('never emits a raw subject id or capability key', () => {
    const leaked = approvalRowSubject({
      subjectType: 'quote',
      subjectId: SUBJECT_ID,
      quoteNumber: SUBJECT_ID,
      customerName: 'commercial.team.read',
    });
    assert.equal(leaked, 'Cotización');
    assert.doesNotMatch(leaked, new RegExp(SUBJECT_ID));
    assert.doesNotMatch(leaked, /approval\.act|commercial\.team\.read|commercial\.org\.read/);

    const scopeType = approvalRowSubject({
      subjectType: 'commercial.team.read',
      quoteNumber: 'Q-1',
      customerName: 'ASTRIX',
    });
    assert.equal(scopeType, APPROVAL_ROW_SUBJECT_FALLBACK);
    assert.doesNotMatch(scopeType, /commercial\.team\.read/);
  });

  it('distinguishes rows whose authorized subjects differ', () => {
    const first = approvalRowSubject({
      subjectType: 'quote',
      quoteNumber: 'Q-000010',
      customerName: 'ZZV1SMOKE',
    });
    const second = approvalRowSubject({
      subjectType: 'quote',
      quoteNumber: 'Q-000020',
      customerName: 'ASTRIX',
    });
    assert.equal(first, 'Cotización Q-000010');
    assert.equal(second, 'Cotización Q-000020 · ASTRIX');
    assert.notEqual(first, second);
  });
});

describe('approval subject enrichment', () => {
  it('keeps the list when one subject read fails', async () => {
    const labels = await approvalSubjectsForItems(
      [
        { approvalRequestId: 'a1', subjectType: 'quote', subjectId: 'missing' },
        { approvalRequestId: 'a2', subjectType: 'quote', subjectId: 'ok' },
        { approvalRequestId: 'a3', subjectType: 'order', subjectId: 'denied' },
      ],
      async (item) => {
        if (item.approvalRequestId === 'a1') throw new Error('not_found');
        if (item.approvalRequestId === 'a3') throw new Error('forbidden');
        return { quoteNumber: 'Q-000026', customerName: 'IMPORTAMEC' };
      },
    );

    assert.equal(labels.get('a1'), 'Cotización');
    assert.equal(labels.get('a2'), 'Cotización Q-000026 · IMPORTAMEC');
    assert.equal(labels.get('a3'), 'Pedido');
    assert.equal(labels.size, 3);
    assert.doesNotMatch([...labels.values()].join('\n'), /missing|denied|not_found|forbidden/);
  });
});
