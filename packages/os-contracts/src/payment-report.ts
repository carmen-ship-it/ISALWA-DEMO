import { z } from 'zod';

/**
 * T07 / A1 §6 — reported payments and human verification.
 *
 * This is operational payment reporting, not bank integration, tax invoicing or a
 * ledger. A report is a claim. Each tender (QR, efectivo, transferencia, otro) has its
 * own verification outcome, decided only by a person holding payments.confirm. The
 * report's aggregate state is DERIVED from those outcomes; it is never stored as one
 * "confirmed" flag. Nothing here confirms funds from an image, OCR or a customer's
 * statement: an upload is evidence for a human, not an outcome.
 *
 * Extends the existing reported-operational-fact `payment` row (os_reported_operational_facts):
 * that row keeps `confirmation = 'pending'` forever (its CHECK is unchanged); verification
 * lives in separate append-only tender outcome rows ("a future finance confirmation is a
 * different record", migration 20260914120000).
 */

export const PAYMENT_CURRENCY = 'BOB' as const;

export const PAYMENT_TENDER_METHODS = ['qr', 'cash', 'transfer', 'other'] as const;
export type PaymentTenderMethod = (typeof PAYMENT_TENDER_METHODS)[number];

export const PAYMENT_TENDER_METHOD_LABELS: Record<PaymentTenderMethod, string> = {
  qr: 'QR',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
};

/** Current verification of one tender. `reversed` only follows `confirmed`. */
export const PAYMENT_TENDER_VERIFICATIONS = ['pending', 'confirmed', 'rejected', 'reversed'] as const;
export type PaymentTenderVerification = (typeof PAYMENT_TENDER_VERIFICATIONS)[number];

export const PAYMENT_TENDER_VERIFICATION_LABELS: Record<PaymentTenderVerification, string> = {
  pending: 'Por verificar',
  confirmed: 'Recepción confirmada',
  rejected: 'Rechazado',
  reversed: 'Revertido',
};

/** Outcome rows recorded by a human. `pending` is the absence of an outcome. */
export const PAYMENT_OUTCOME_ACTIONS = ['confirmed', 'rejected', 'reversed'] as const;
export type PaymentOutcomeAction = (typeof PAYMENT_OUTCOME_ACTIONS)[number];

/**
 * Documented state mapping (tender outcomes → report aggregate). Counts are over tenders:
 *  - all pending                                  → pending
 *  - all confirmed                                → confirmed
 *  - all rejected                                 → rejected
 *  - all reversed                                 → reversed
 *  - some pending and some decided                → partially_verified
 *  - none pending, ≥1 confirmed, rest not         → partially_confirmed
 *  - none pending, none confirmed, rejected+reversed mixed → not_confirmed
 * Amounts (confirmed / pending / rejected / reversed) are always reported next to it.
 */
export const PAYMENT_REPORT_STATES = [
  'pending',
  'partially_verified',
  'confirmed',
  'partially_confirmed',
  'rejected',
  'reversed',
  'not_confirmed',
] as const;
export type PaymentReportState = (typeof PAYMENT_REPORT_STATES)[number];

export const PAYMENT_REPORT_STATE_LABELS: Record<PaymentReportState, string> = {
  pending: 'Pendiente de verificación',
  partially_verified: 'Verificación parcial',
  confirmed: 'Recepción confirmada',
  partially_confirmed: 'Confirmado en parte',
  rejected: 'Rechazado',
  reversed: 'Revertido',
  not_confirmed: 'Sin recepción confirmada',
};

export const PAYMENT_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export type PaymentEvidenceType = (typeof PAYMENT_EVIDENCE_TYPES)[number];
export const PAYMENT_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const PAYMENT_MAX_TENDERS = 8;

export const PAYMENT_REPORT_COPY = {
  recordedTitle: 'Pago reportado',
  recorded: 'Pago reportado. Pendiente de verificación de Contabilidad.',
  /** Not an accounting balance. */
  registeredInIsalwa: 'Pagos registrados en ISALWA',
  registeredInIsalwaNote:
    'Suma de los pagos reportados y verificados en ISALWA. No es el saldo contable del cliente.',
  duplicateWarning: 'Este comprobante podría estar registrado. Revisar posible duplicado.',
  recipientUnresolved: 'Receptor por confirmar',
  instructionsAbsent: 'No hay instrucciones de pago aprobadas para compartir',
  instructionsChanged: 'Las instrucciones de pago cambiaron. Revisa la versión vigente.',
  instructionsShareQr:
    'Te comparto el QR de pago de ISALWA. Verifica el nombre del destinatario antes de pagar y envíanos el comprobante para su revisión.',
  instructionsShareTransferPrefix: 'Te comparto los datos de transferencia aprobados de ISALWA:',
  instructionsShareTransferSuffix:
    'Envíanos el comprobante para que Contabilidad verifique la recepción.',
} as const;

// ---------------------------------------------------------------------------
// Report input
// ---------------------------------------------------------------------------

const Centavos = z.string().regex(/^[1-9]\d{0,14}$/, 'amount_must_be_positive_integer_centavos');
const OptionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

export const PaymentTenderInputSchema = z
  .object({
    method: z.enum(PAYMENT_TENDER_METHODS),
    amountCentavos: Centavos,
    reference: OptionalText(120),
    /** Cash only: the authorized member who physically received it. */
    cashRecipientMemberId: OptionalText(120),
    /** Cash only: why the recipient is not known yet. Funds cannot be confirmed until resolved. */
    cashRecipientUnresolvedReason: OptionalText(300),
  })
  .strict();
export type PaymentTenderInput = z.input<typeof PaymentTenderInputSchema>;

export type PaymentReportProblem =
  | 'tenders_must_sum_to_total'
  | 'cash_recipient_required'
  | 'cash_recipient_conflict'
  | 'recipient_only_for_cash'
  | 'paid_on_in_future';

function addTenderIssues(
  value: { totalCentavos?: string; tenders: Array<z.output<typeof PaymentTenderInputSchema>> },
  ctx: z.RefinementCtx,
): void {
  const wholeCentavos = /^[1-9]\d{0,14}$/;
  const amountsValid =
    value.tenders.every((tender) => wholeCentavos.test(tender.amountCentavos)) &&
    (value.totalCentavos === undefined || wholeCentavos.test(value.totalCentavos));
  if (amountsValid && value.totalCentavos !== undefined) {
    const sum = value.tenders.reduce((acc, tender) => acc + BigInt(tender.amountCentavos), 0n);
    if (sum !== BigInt(value.totalCentavos)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tenders_must_sum_to_total' satisfies PaymentReportProblem,
        path: ['tenders'],
      });
    }
  }
  value.tenders.forEach((tender, index) => {
    const hasRecipient = !!tender.cashRecipientMemberId;
    const hasReason = !!tender.cashRecipientUnresolvedReason;
    if (tender.method === 'cash') {
      if (!hasRecipient && !hasReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'cash_recipient_required' satisfies PaymentReportProblem,
          path: ['tenders', index],
        });
      }
      if (hasRecipient && hasReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'cash_recipient_conflict' satisfies PaymentReportProblem,
          path: ['tenders', index],
        });
      }
    } else if (hasRecipient || hasReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'recipient_only_for_cash' satisfies PaymentReportProblem,
        path: ['tenders', index],
      });
    }
  });
}

/**
 * RecordPaymentReport. Strict: organization, reporter, confirmation and outcome fields
 * cannot be supplied by the client. Customer is required (an order is optional and only
 * a stated intent, never an allocation).
 */
export const PaymentReportInputSchema = z
  .object({
    customerId: z.string().trim().min(1),
    orderId: OptionalText(120),
    currency: z.literal(PAYMENT_CURRENCY).default(PAYMENT_CURRENCY),
    totalCentavos: Centavos,
    /** Calendar day the customer paid, YYYY-MM-DD (La Paz). */
    paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tenders: z.array(PaymentTenderInputSchema).min(1).max(PAYMENT_MAX_TENDERS),
    note: OptionalText(1000),
  })
  .strict()
  .superRefine((value, ctx) => addTenderIssues(value, ctx));
export type PaymentReportInput = z.input<typeof PaymentReportInputSchema>;
export type PaymentReportParsed = z.output<typeof PaymentReportInputSchema>;

/** Tenders of a replacement: the total is their exact sum, so it cannot disagree. */
export const PaymentReplacementInputSchema = z
  .object({
    paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tenders: z.array(PaymentTenderInputSchema).min(1).max(PAYMENT_MAX_TENDERS),
    note: OptionalText(1000),
  })
  .strict()
  .superRefine((value, ctx) => addTenderIssues({ tenders: value.tenders }, ctx));

const Reason = z.string().trim().min(3).max(500);

/** Confirm or reject one tender. The reason is required either way (how it was checked / why not). */
export const PaymentTenderDecisionSchema = z.object({ reason: Reason }).strict();

export const PaymentTenderReversalSchema = z
  .object({ reason: Reason, replacement: PaymentReplacementInputSchema.optional() })
  .strict();

export const PaymentCashRecipientResolutionSchema = z
  .object({ recipientMemberId: z.string().trim().min(1), reason: OptionalText(300) })
  .strict();

export const PaymentAllocationInputSchema = z
  .object({ orderId: z.string().trim().min(1), amountCentavos: Centavos })
  .strict();

export const PaymentAllocationReleaseSchema = z.object({ reason: Reason }).strict();

/** The customer paid on a calendar day that has not happened yet (one day of timezone slack). */
export function paidOnProblem(paidOn: string, now: Date): PaymentReportProblem | null {
  const parsed = new Date(`${paidOn}T12:00:00-04:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const latest = now.getTime() + 36 * 60 * 60 * 1000;
  return parsed.getTime() > latest ? 'paid_on_in_future' : null;
}

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

export type TenderForState = { amountCentavos: string | bigint; verification: PaymentTenderVerification };

export type PaymentReportTotals = {
  state: PaymentReportState;
  reportedCentavos: string;
  confirmedCentavos: string;
  pendingCentavos: string;
  rejectedCentavos: string;
  reversedCentavos: string;
  allocatedCentavos: string;
  /** Confirmed funds not assigned to any order. Never negative. */
  unassignedCentavos: string;
  counts: Record<PaymentTenderVerification, number>;
};

export function derivePaymentReportTotals(
  tenders: readonly TenderForState[],
  allocatedCentavos: string | bigint = 0n,
): PaymentReportTotals {
  const sums: Record<PaymentTenderVerification, bigint> = { pending: 0n, confirmed: 0n, rejected: 0n, reversed: 0n };
  const counts: Record<PaymentTenderVerification, number> = { pending: 0, confirmed: 0, rejected: 0, reversed: 0 };
  for (const tender of tenders) {
    sums[tender.verification] += BigInt(tender.amountCentavos);
    counts[tender.verification] += 1;
  }
  const total = tenders.length;
  const decided = total - counts.pending;
  let state: PaymentReportState;
  if (total === 0 || counts.pending === total) state = 'pending';
  else if (counts.confirmed === total) state = 'confirmed';
  else if (counts.rejected === total) state = 'rejected';
  else if (counts.reversed === total) state = 'reversed';
  else if (counts.pending > 0 && decided > 0) state = 'partially_verified';
  else if (counts.confirmed > 0) state = 'partially_confirmed';
  else state = 'not_confirmed';
  const allocated = BigInt(allocatedCentavos);
  const unassigned = sums.confirmed > allocated ? sums.confirmed - allocated : 0n;
  return {
    state,
    reportedCentavos: String(sums.pending + sums.confirmed + sums.rejected + sums.reversed),
    confirmedCentavos: String(sums.confirmed),
    pendingCentavos: String(sums.pending),
    rejectedCentavos: String(sums.rejected),
    reversedCentavos: String(sums.reversed),
    allocatedCentavos: String(allocated),
    unassignedCentavos: String(unassigned),
    counts,
  };
}

export type TenderDecisionProblem =
  | 'not_pending'
  | 'recipient_unresolved'
  | 'not_confirmed';

/** A tender is confirmed/rejected from `pending` only. Cash with an unresolved recipient is not confirmable. */
export function tenderConfirmProblem(tender: {
  verification: PaymentTenderVerification;
  method: PaymentTenderMethod;
  cashRecipientMemberId: string | null;
}): TenderDecisionProblem | null {
  if (tender.verification !== 'pending') return 'not_pending';
  if (tender.method === 'cash' && !tender.cashRecipientMemberId) return 'recipient_unresolved';
  return null;
}

export function tenderRejectProblem(tender: { verification: PaymentTenderVerification }): TenderDecisionProblem | null {
  return tender.verification === 'pending' ? null : 'not_pending';
}

/** Reversal is the only way to undo confirmed funds: a confirmed tender, never overwritten. */
export function tenderReverseProblem(tender: { verification: PaymentTenderVerification }): TenderDecisionProblem | null {
  return tender.verification === 'confirmed' ? null : 'not_confirmed';
}

export type AllocationProblem = 'exceeds_confirmed' | 'amount_not_positive';

/** Allocations may never exceed confirmed funds. Remainder stays "Anticipo sin asignar". */
export function allocationProblem(input: {
  confirmedCentavos: string | bigint;
  activeAllocatedCentavos: string | bigint;
  requestedCentavos: string | bigint;
}): AllocationProblem | null {
  const requested = BigInt(input.requestedCentavos);
  if (requested <= 0n) return 'amount_not_positive';
  return BigInt(input.activeAllocatedCentavos) + requested > BigInt(input.confirmedCentavos)
    ? 'exceeds_confirmed'
    : null;
}

/** True when allocated funds would exceed what remains confirmed after reversing `reversedCentavos`. */
export function reversalLeavesOverAllocation(input: {
  confirmedCentavos: string | bigint;
  activeAllocatedCentavos: string | bigint;
  reversedCentavos: string | bigint;
}): boolean {
  return BigInt(input.confirmedCentavos) - BigInt(input.reversedCentavos) < BigInt(input.activeAllocatedCentavos);
}

// ---------------------------------------------------------------------------
// Evidence + duplicates
// ---------------------------------------------------------------------------

/** Declared content type must match the file's own signature. The header is not trusted. */
export function sniffPaymentEvidenceType(bytes: Uint8Array): PaymentEvidenceType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }
  return null;
}

/** References are not always unique; a normalized match is a warning, never a conclusion. */
export function normalizePaymentReference(reference: string | null | undefined): string | null {
  const normalized = (reference ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized.length >= 4 ? normalized : null;
}

export function safeEvidenceFileName(name: string | null | undefined): string {
  const base = (name ?? '').split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[^\p{L}\p{N}._ -]/gu, '').trim().slice(0, 120);
  return cleaned || 'comprobante';
}

// ---------------------------------------------------------------------------
// Payment instructions (approved public destination, versioned)
// ---------------------------------------------------------------------------

export const PAYMENT_INSTRUCTION_METHODS = ['qr', 'transfer'] as const;
export type PaymentInstructionMethod = (typeof PAYMENT_INSTRUCTION_METHODS)[number];
export const PAYMENT_INSTRUCTION_STATUSES = ['draft', 'published', 'retired'] as const;
export type PaymentInstructionStatus = (typeof PAYMENT_INSTRUCTION_STATUSES)[number];

export const PaymentInstructionDraftSchema = z
  .object({
    method: z.enum(PAYMENT_INSTRUCTION_METHODS),
    holderLabel: z.string().trim().min(2).max(160),
    bankName: OptionalText(120),
    accountReference: OptionalText(120),
    publicNote: OptionalText(500),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().transform((v) => v ?? null),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().transform((v) => v ?? null),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.method === 'transfer' && (!value.bankName || !value.accountReference)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'transfer_needs_bank_and_account', path: ['accountReference'] });
    }
    if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'valid_until_before_from', path: ['validUntil'] });
    }
  });
export type PaymentInstructionDraftInput = z.input<typeof PaymentInstructionDraftSchema>;

export const PaymentInstructionRetireSchema = z.object({ reason: Reason }).strict();

export type PaymentInstructionPublic = {
  id: string;
  version: number;
  method: PaymentInstructionMethod;
  holderLabel: string;
  bankName: string | null;
  accountReference: string | null;
  currency: typeof PAYMENT_CURRENCY;
  publicNote: string | null;
  validFrom: string | null;
  validUntil: string | null;
  hasQr: boolean;
  status: PaymentInstructionStatus;
};

/** A destination is publishable only when it is complete: a QR needs its approved file. */
export function paymentInstructionPublishProblem(input: {
  method: PaymentInstructionMethod;
  hasQr: boolean;
  createdByMemberId: string;
  publisherMemberId: string;
}): 'qr_file_required' | 'same_person_cannot_publish' | null {
  if (input.createdByMemberId === input.publisherMemberId) return 'same_person_cannot_publish';
  if (input.method === 'qr' && !input.hasQr) return 'qr_file_required';
  return null;
}

/** H08 (QR) / H09 (transfer). Always a human review/send; this only builds the preview text. */
export function buildPaymentInstructionShareText(instruction: PaymentInstructionPublic): string {
  if (instruction.method === 'qr') return PAYMENT_REPORT_COPY.instructionsShareQr;
  const parts = [
    `Titular: ${instruction.holderLabel}`,
    instruction.bankName ? `Banco: ${instruction.bankName}` : null,
    instruction.accountReference ? `Cuenta: ${instruction.accountReference}` : null,
    `Moneda: ${instruction.currency}`,
    instruction.publicNote,
  ].filter((part): part is string => !!part);
  return `${PAYMENT_REPORT_COPY.instructionsShareTransferPrefix} ${parts.join(' · ')}. ${PAYMENT_REPORT_COPY.instructionsShareTransferSuffix}`;
}

/** Whether the instruction is within its stated validity window (calendar dates, La Paz). */
export function paymentInstructionIsCurrent(
  instruction: Pick<PaymentInstructionPublic, 'status' | 'validFrom' | 'validUntil'>,
  today: string,
): boolean {
  if (instruction.status !== 'published') return false;
  if (instruction.validFrom && today < instruction.validFrom) return false;
  if (instruction.validUntil && today > instruction.validUntil) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Views returned by os-api
// ---------------------------------------------------------------------------

export type PaymentTenderView = {
  id: string;
  seq: number;
  method: PaymentTenderMethod;
  amountCentavos: string;
  reference: string | null;
  verification: PaymentTenderVerification;
  cashRecipientMemberId: string | null;
  cashRecipientLabel: string | null;
  cashRecipientUnresolvedReason: string | null;
  outcomes: Array<{
    action: PaymentOutcomeAction;
    reason: string;
    actorMemberId: string;
    actorLabel: string;
    at: string;
  }>;
  /** Tender this one replaces after a reversal. */
  replacesTenderId: string | null;
};

export type PaymentEvidenceView = {
  id: string;
  tenderId: string | null;
  fileName: string;
  contentType: PaymentEvidenceType;
  sizeBytes: number;
  uploadedAt: string;
};

export type PaymentAllocationView = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  amountCentavos: string;
  status: 'active' | 'released';
  allocatedByLabel: string;
  allocatedAt: string;
  releasedReason: string | null;
};

export type PaymentReportView = {
  id: string;
  customerId: string;
  customerLabel: string;
  /** Stated intent only. Not an allocation. */
  orderId: string | null;
  orderNumber: string | null;
  currency: typeof PAYMENT_CURRENCY;
  paidOn: string;
  reportedAt: string;
  reportedByMemberId: string | null;
  reportedByLabel: string;
  note: string | null;
  tenders: PaymentTenderView[];
  totals: PaymentReportTotals;
  evidence: PaymentEvidenceView[];
  allocations: PaymentAllocationView[];
  /** Report this one replaces after a reversal. */
  correctsReportId: string | null;
  /** Generic warning only: no other report, customer or amount is disclosed. */
  possibleDuplicate: boolean;
  /** What the viewer may do (server-computed from current authority, never a hint to trust). */
  can: { verify: boolean; allocate: boolean; addEvidence: boolean };
};
