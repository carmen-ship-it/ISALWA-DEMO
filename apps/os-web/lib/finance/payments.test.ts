import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FINANCE_DESK_COPY,
  PAYMENT_DESK_COPY,
  PAYMENT_ERROR_COPY,
  PAYMENT_FORM_PROBLEM_COPY,
  buildPaymentReportRequest,
  formatBs,
  parseBsToCentavos,
  paymentErrorCopy,
  tenderSumDifference,
  type PaymentFormDraft,
} from './index';
import { FINANCE_FORBIDDEN_COPY } from './copy';

const draft = (overrides: Partial<PaymentFormDraft> = {}): PaymentFormDraft => ({
  customerId: 'cust-1',
  orderId: '',
  total: '1270',
  paidOn: '2026-11-16',
  note: '',
  tenders: [
    { key: 'a', method: 'qr', amount: '200', reference: 'QR-1', cashRecipientMemberId: '', cashRecipientUnresolvedReason: '' },
    {
      key: 'b',
      method: 'cash',
      amount: '1070',
      reference: '',
      cashRecipientMemberId: '',
      cashRecipientUnresolvedReason: 'No se anotó',
    },
  ],
  ...overrides,
});

describe('reported payment form helpers', () => {
  it('parses Bolivian amounts into whole centavos and rejects the rest', () => {
    assert.equal(parseBsToCentavos('1270'), '127000');
    assert.equal(parseBsToCentavos('1.270,50'), '127050');
    assert.equal(parseBsToCentavos('1,270.5'), '127050');
    assert.equal(parseBsToCentavos('0,5'), '50');
    for (const bad of ['', '0', '0,00', '-5', '12,345', 'abc', '1e3']) {
      assert.equal(parseBsToCentavos(bad), null, bad);
    }
    assert.equal(formatBs('127000'), 'Bs 1.270,00');
    assert.equal(formatBs(BigInt(5)), 'Bs 0,05');
  });

  it('builds QR 200 + cash 1070 = 1270 with an explicit unresolved receiver', () => {
    const result = buildPaymentReportRequest(draft());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.body.totalCentavos, '127000');
    assert.deepEqual(
      result.body.tenders.map((t) => [t.method, t.amountCentavos]),
      [['qr', '20000'], ['cash', '107000']],
    );
    assert.equal(result.body.tenders[1]!.cashRecipientMemberId, null);
    assert.equal(result.body.tenders[1]!.cashRecipientUnresolvedReason, 'No se anotó');
    assert.equal(tenderSumDifference(draft()), BigInt(0));
  });

  it('refuses a missing customer, bad amounts, a sum mismatch and cash without receiver or reason', () => {
    const problem = (d: PaymentFormDraft) => {
      const r = buildPaymentReportRequest(d);
      return r.ok ? null : r.problem;
    };
    assert.equal(problem(draft({ customerId: ' ' })), 'customer_required');
    assert.equal(problem(draft({ total: 'x' })), 'total_invalid');
    assert.equal(problem(draft({ total: '1271' })), 'sum_mismatch');
    assert.equal(tenderSumDifference(draft({ total: '1271' })), BigInt(100));
    const cashNoRecipient = draft({
      tenders: [{ key: 'b', method: 'cash', amount: '1270', reference: '', cashRecipientMemberId: '', cashRecipientUnresolvedReason: ' ' }],
    });
    assert.equal(problem(cashNoRecipient), 'cash_recipient_required');
    const zero = draft({
      tenders: [
        { key: 'a', method: 'qr', amount: '0', reference: '', cashRecipientMemberId: '', cashRecipientUnresolvedReason: '' },
        { key: 'b', method: 'qr', amount: '1270', reference: '', cashRecipientMemberId: '', cashRecipientUnresolvedReason: '' },
      ],
    });
    assert.equal(problem(zero), 'amount_invalid');
    for (const text of Object.values(PAYMENT_FORM_PROBLEM_COPY)) assert.ok(text.length > 10);
  });

  it('a known receiver wins over any typed reason, and non-cash never carries a receiver', () => {
    const result = buildPaymentReportRequest(
      draft({
        total: '10',
        tenders: [
          {
            key: 'a',
            method: 'cash',
            amount: '10',
            reference: '',
            cashRecipientMemberId: 'member-9',
            cashRecipientUnresolvedReason: 'sobrante',
          },
        ],
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.body.tenders[0]!.cashRecipientMemberId, 'member-9');
    assert.equal(result.body.tenders[0]!.cashRecipientUnresolvedReason, null);
    const qr = buildPaymentReportRequest(
      draft({
        total: '10',
        tenders: [{ key: 'a', method: 'qr', amount: '10', reference: '', cashRecipientMemberId: 'member-9', cashRecipientUnresolvedReason: 'x' }],
      }),
    );
    assert.equal(qr.ok, true);
    if (!qr.ok) return;
    assert.equal(qr.body.tenders[0]!.cashRecipientMemberId, null);
  });

  it('maps API codes to Spanish copy and never shows a code, nor claims a balance or a confirmed collection', () => {
    assert.match(paymentErrorCopy('OVER_ALLOCATION', 'x'), /fondos confirmados/);
    assert.equal(paymentErrorCopy('SOMETHING_NEW', 'respaldo'), 'respaldo');
    assert.equal(paymentErrorCopy(undefined, 'respaldo'), 'respaldo');
    const rendered = [
      ...Object.values(PAYMENT_DESK_COPY),
      ...Object.values(PAYMENT_ERROR_COPY),
      ...Object.values(PAYMENT_FORM_PROBLEM_COPY),
      FINANCE_DESK_COPY.paymentSectionTitle,
    ].join('\n');
    for (const forbidden of FINANCE_FORBIDDEN_COPY) assert.doesNotMatch(rendered, forbidden);
    for (const text of Object.values(PAYMENT_ERROR_COPY)) assert.doesNotMatch(text, /[A-Z]+_[A-Z_]+/);
    assert.match(PAYMENT_DESK_COPY.registeredNote, /No es el saldo contable/);
  });
});
