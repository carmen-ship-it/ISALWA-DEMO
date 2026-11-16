import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PAYMENT_REPORT_COPY,
  PaymentAllocationInputSchema,
  PaymentInstructionDraftSchema,
  PaymentReportInputSchema,
  PaymentTenderDecisionSchema,
  PaymentTenderReversalSchema,
  allocationProblem,
  buildPaymentInstructionShareText,
  derivePaymentReportTotals,
  normalizePaymentReference,
  paidOnProblem,
  paymentInstructionIsCurrent,
  paymentInstructionPublishProblem,
  reversalLeavesOverAllocation,
  safeEvidenceFileName,
  sniffPaymentEvidenceType,
  tenderConfirmProblem,
  tenderRejectProblem,
  tenderReverseProblem,
  canReportPayment,
  canVerifyReportedPayment,
  canPublishPaymentInstructions,
  canConfirmFinance,
  type PaymentTenderVerification,
} from './index';

const base = {
  customerId: 'cust-1',
  totalCentavos: '127000',
  paidOn: '2026-11-16',
  tenders: [
    { method: 'qr', amountCentavos: '20000', reference: 'QR-55120' },
    { method: 'cash', amountCentavos: '107000', cashRecipientMemberId: 'mem-caja' },
  ],
};

function issues(input: unknown): string[] {
  const parsed = PaymentReportInputSchema.safeParse(input);
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
}

describe('payment report input (T07)', () => {
  it('accepts the synthetic QR 200 + cash 1070 = 1270 case', () => {
    const parsed = PaymentReportInputSchema.parse(base);
    assert.equal(parsed.currency, 'BOB');
    assert.equal(parsed.tenders.length, 2);
    assert.equal(parsed.orderId, null);
  });

  it('rejects tenders that do not sum exactly to the total, in either direction', () => {
    assert.ok(issues({ ...base, totalCentavos: '127001' }).includes('tenders_must_sum_to_total'));
    assert.ok(issues({ ...base, totalCentavos: '126999' }).includes('tenders_must_sum_to_total'));
  });

  it('rejects zero, negative, decimal and non-numeric tender amounts', () => {
    for (const amountCentavos of ['0', '-100', '10.5', '1e3', '', 'abc']) {
      const out = issues({
        ...base,
        totalCentavos: '100',
        tenders: [{ method: 'qr', amountCentavos }],
      });
      assert.ok(out.length > 0, amountCentavos);
    }
  });

  it('cash needs a known recipient or an explicit unresolved reason, never both', () => {
    const cash = (extra: Record<string, unknown>) => ({
      ...base,
      totalCentavos: '100',
      tenders: [{ method: 'cash', amountCentavos: '100', ...extra }],
    });
    assert.ok(issues(cash({})).includes('cash_recipient_required'));
    assert.deepEqual(issues(cash({ cashRecipientMemberId: 'mem-1' })), []);
    assert.deepEqual(issues(cash({ cashRecipientUnresolvedReason: 'Lo recibió una persona en caja' })), []);
    assert.ok(
      issues(cash({ cashRecipientMemberId: 'mem-1', cashRecipientUnresolvedReason: 'x1y' })).includes(
        'cash_recipient_conflict',
      ),
    );
    assert.ok(
      issues({
        ...base,
        totalCentavos: '100',
        tenders: [{ method: 'qr', amountCentavos: '100', cashRecipientMemberId: 'mem-1' }],
      }).includes('recipient_only_for_cash'),
    );
  });

  it('is strict: the client cannot supply tenant, reporter, confirmation or outcome fields', () => {
    for (const extra of [
      { organizationId: 'org-x' },
      { reportedByMemberId: 'mem-x' },
      { confirmation: 'confirmed' },
      { confirmed: true },
      { verification: 'confirmed' },
      { status: 'confirmed' },
    ]) {
      assert.equal(PaymentReportInputSchema.safeParse({ ...base, ...extra }).success, false, JSON.stringify(extra));
    }
    assert.equal(
      PaymentReportInputSchema.safeParse({
        ...base,
        tenders: [{ method: 'qr', amountCentavos: '127000', verification: 'confirmed' }],
      }).success,
      false,
    );
  });

  it('only BOB, at most eight tenders, at least one', () => {
    assert.equal(PaymentReportInputSchema.safeParse({ ...base, currency: 'USD' }).success, false);
    assert.equal(PaymentReportInputSchema.safeParse({ ...base, tenders: [] }).success, false);
    const nine = Array.from({ length: 9 }, () => ({ method: 'qr', amountCentavos: '100' }));
    assert.equal(
      PaymentReportInputSchema.safeParse({ ...base, totalCentavos: '900', tenders: nine }).success,
      false,
    );
  });

  it('refuses a payment date that has not happened', () => {
    const now = new Date('2026-11-16T12:00:00Z');
    assert.equal(paidOnProblem('2026-11-16', now), null);
    assert.equal(paidOnProblem('2026-11-17', now), null);
    assert.equal(paidOnProblem('2026-11-25', now), 'paid_on_in_future');
  });
});

describe('derived report state (no single confirmed flag)', () => {
  const t = (verification: PaymentTenderVerification, amount: string) => ({ amountCentavos: amount, verification });

  it('maps tender outcomes to an aggregate and keeps amounts separate', () => {
    const cases: Array<[PaymentTenderVerification[], string]> = [
      [['pending', 'pending'], 'pending'],
      [['confirmed', 'confirmed'], 'confirmed'],
      [['rejected', 'rejected'], 'rejected'],
      [['reversed', 'reversed'], 'reversed'],
      [['confirmed', 'pending'], 'partially_verified'],
      [['rejected', 'pending'], 'partially_verified'],
      [['confirmed', 'rejected'], 'partially_confirmed'],
      [['confirmed', 'reversed'], 'partially_confirmed'],
      [['rejected', 'reversed'], 'not_confirmed'],
    ];
    for (const [verifications, expected] of cases) {
      const totals = derivePaymentReportTotals(verifications.map((v, i) => t(v, String((i + 1) * 100))));
      assert.equal(totals.state, expected, verifications.join('+'));
    }
  });

  it('QR confirmed, cash pending: partially verified with 200 confirmed of 1270 and cash still pending', () => {
    const totals = derivePaymentReportTotals([t('confirmed', '20000'), t('pending', '107000')]);
    assert.equal(totals.state, 'partially_verified');
    assert.equal(totals.reportedCentavos, '127000');
    assert.equal(totals.confirmedCentavos, '20000');
    assert.equal(totals.pendingCentavos, '107000');
    assert.equal(totals.unassignedCentavos, '20000');
    assert.equal('confirmed' in totals, false);
  });

  it('unassigned is confirmed minus active allocations and never negative', () => {
    const totals = derivePaymentReportTotals([t('confirmed', '100000'), t('pending', '27000')], '40000');
    assert.equal(totals.allocatedCentavos, '40000');
    assert.equal(totals.unassignedCentavos, '60000');
    assert.equal(derivePaymentReportTotals([t('pending', '100')], '50').unassignedCentavos, '0');
  });
});

describe('tender verification and allocation rules', () => {
  it('confirms or rejects only from pending; cash without a recipient is not confirmable', () => {
    assert.equal(tenderConfirmProblem({ verification: 'pending', method: 'qr', cashRecipientMemberId: null }), null);
    assert.equal(
      tenderConfirmProblem({ verification: 'pending', method: 'cash', cashRecipientMemberId: null }),
      'recipient_unresolved',
    );
    assert.equal(
      tenderConfirmProblem({ verification: 'pending', method: 'cash', cashRecipientMemberId: 'm' }),
      null,
    );
    for (const verification of ['confirmed', 'rejected', 'reversed'] as const) {
      assert.equal(
        tenderConfirmProblem({ verification, method: 'qr', cashRecipientMemberId: null }),
        'not_pending',
      );
      assert.equal(tenderRejectProblem({ verification }), 'not_pending');
    }
    assert.equal(tenderRejectProblem({ verification: 'pending' }), null);
  });

  it('only a confirmed tender can be reversed', () => {
    assert.equal(tenderReverseProblem({ verification: 'confirmed' }), null);
    for (const verification of ['pending', 'rejected', 'reversed'] as const) {
      assert.equal(tenderReverseProblem({ verification }), 'not_confirmed');
    }
  });

  it('requires a reason to confirm, reject and reverse', () => {
    assert.equal(PaymentTenderDecisionSchema.safeParse({}).success, false);
    assert.equal(PaymentTenderDecisionSchema.safeParse({ reason: ' ' }).success, false);
    assert.equal(PaymentTenderDecisionSchema.safeParse({ reason: 'Visto en extracto' }).success, true);
    assert.equal(PaymentTenderReversalSchema.safeParse({ reason: '' }).success, false);
    assert.equal(PaymentTenderDecisionSchema.safeParse({ reason: 'ok ok', confirmed: true }).success, false);
  });

  it('a reversal replacement carries its own tenders and is validated like a report', () => {
    const ok = PaymentTenderReversalSchema.safeParse({
      reason: 'Monto mal digitado',
      replacement: { paidOn: '2026-11-16', tenders: [{ method: 'qr', amountCentavos: '15000' }] },
    });
    assert.equal(ok.success, true);
    const bad = PaymentTenderReversalSchema.safeParse({
      reason: 'Monto mal digitado',
      replacement: { paidOn: '2026-11-16', tenders: [{ method: 'cash', amountCentavos: '15000' }] },
    });
    assert.equal(bad.success, false);
  });

  it('never allocates beyond confirmed funds', () => {
    assert.equal(allocationProblem({ confirmedCentavos: '100', activeAllocatedCentavos: '0', requestedCentavos: '100' }), null);
    assert.equal(
      allocationProblem({ confirmedCentavos: '100', activeAllocatedCentavos: '60', requestedCentavos: '41' }),
      'exceeds_confirmed',
    );
    assert.equal(allocationProblem({ confirmedCentavos: '100', activeAllocatedCentavos: '0', requestedCentavos: '0' }), 'amount_not_positive');
    assert.equal(PaymentAllocationInputSchema.safeParse({ orderId: 'o', amountCentavos: '-5' }).success, false);
    assert.equal(
      reversalLeavesOverAllocation({ confirmedCentavos: '100', activeAllocatedCentavos: '60', reversedCentavos: '50' }),
      true,
    );
    assert.equal(
      reversalLeavesOverAllocation({ confirmedCentavos: '100', activeAllocatedCentavos: '40', reversedCentavos: '50' }),
      false,
    );
  });
});

describe('evidence and duplicates', () => {
  it('trusts the file signature, not the header', () => {
    assert.equal(sniffPaymentEvidenceType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
    assert.equal(sniffPaymentEvidenceType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
    assert.equal(sniffPaymentEvidenceType(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])), 'application/pdf');
    assert.equal(sniffPaymentEvidenceType(Uint8Array.from([0x3c, 0x73, 0x76, 0x67])), null);
    assert.equal(sniffPaymentEvidenceType(new TextEncoder().encode('<script>alert(1)</script>')), null);
  });

  it('normalizes references for duplicate hints and ignores short ones', () => {
    assert.equal(normalizePaymentReference(' qr-55 120 '), 'QR55120');
    assert.equal(normalizePaymentReference('12'), null);
    assert.equal(normalizePaymentReference(null), null);
  });

  it('cleans evidence file names', () => {
    assert.equal(safeEvidenceFileName('../../etc/pass wd.png'), 'pass wd.png');
    assert.equal(safeEvidenceFileName(''), 'comprobante');
    assert.equal(safeEvidenceFileName('C:\\x\\<b>.pdf'), 'b.pdf');
  });
});

describe('approved payment instructions', () => {
  const qr = {
    id: 'pi-1',
    version: 1,
    method: 'qr' as const,
    holderLabel: 'ISALWA SRL',
    bankName: null,
    accountReference: null,
    currency: 'BOB' as const,
    publicNote: null,
    validFrom: null,
    validUntil: null,
    hasQr: true,
    status: 'published' as const,
  };

  it('has the approved absent copy and builds H08/H09 text without inventing data', () => {
    assert.equal(PAYMENT_REPORT_COPY.instructionsAbsent, 'No hay instrucciones de pago aprobadas para compartir');
    assert.match(buildPaymentInstructionShareText(qr), /^Te comparto el QR de pago de ISALWA\./);
    const transfer = buildPaymentInstructionShareText({
      ...qr,
      method: 'transfer',
      bankName: 'Banco Prueba',
      accountReference: '000-111',
      hasQr: false,
    });
    assert.match(transfer, /^Te comparto los datos de transferencia aprobados de ISALWA: Titular: ISALWA SRL · Banco: Banco Prueba · Cuenta: 000-111 · Moneda: BOB\./);
    assert.match(transfer, /Contabilidad verifique la recepción\.$/);
  });

  it('a transfer needs bank and account; a QR needs its approved file', () => {
    assert.equal(
      PaymentInstructionDraftSchema.safeParse({ method: 'transfer', holderLabel: 'ISALWA SRL' }).success,
      false,
    );
    assert.equal(PaymentInstructionDraftSchema.safeParse({ method: 'qr', holderLabel: 'ISALWA SRL' }).success, true);
    assert.equal(
      paymentInstructionPublishProblem({ method: 'qr', hasQr: false, createdByMemberId: 'a', publisherMemberId: 'b' }),
      'qr_file_required',
    );
  });

  it('the person who drafted a destination cannot publish it', () => {
    assert.equal(
      paymentInstructionPublishProblem({ method: 'transfer', hasQr: false, createdByMemberId: 'a', publisherMemberId: 'a' }),
      'same_person_cannot_publish',
    );
    assert.equal(
      paymentInstructionPublishProblem({ method: 'transfer', hasQr: false, createdByMemberId: 'a', publisherMemberId: 'b' }),
      null,
    );
  });

  it('validity uses calendar dates and only published versions are current', () => {
    assert.equal(paymentInstructionIsCurrent({ status: 'published', validFrom: null, validUntil: null }, '2026-11-16'), true);
    assert.equal(paymentInstructionIsCurrent({ status: 'retired', validFrom: null, validUntil: null }, '2026-11-16'), false);
    assert.equal(paymentInstructionIsCurrent({ status: 'draft', validFrom: null, validUntil: null }, '2026-11-16'), false);
    assert.equal(paymentInstructionIsCurrent({ status: 'published', validFrom: null, validUntil: '2026-11-15' }, '2026-11-16'), false);
    assert.equal(paymentInstructionIsCurrent({ status: 'published', validFrom: '2026-11-20', validUntil: null }, '2026-11-16'), false);
  });
});

describe('payment authority scopes', () => {
  it('report ≠ verify ≠ publish; a title or sibling scope implies none', () => {
    assert.equal(canReportPayment(['payments.report']), true);
    assert.equal(canReportPayment(['finance.operational.record']), true);
    assert.equal(canReportPayment(['payments.confirm']), false);
    assert.equal(canVerifyReportedPayment(['payments.confirm']), true);
    assert.equal(canVerifyReportedPayment(['finance.operational.record', 'payments.report']), false);
    assert.equal(canVerifyReportedPayment(['people.admin', 'commercial.org.read', 'management.org.read']), false);
    assert.equal(canPublishPaymentInstructions(['commercial.payment_instructions.publish']), true);
    assert.equal(canPublishPaymentInstructions(['payments.confirm']), false);
    assert.equal(canConfirmFinance(['payments.confirm']), false);
  });
});
