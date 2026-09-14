import { z } from 'zod';

/**
 * Operational case for one order. A sibling of reported operational facts.
 *
 * A customer saying they paid is not a confirmed payment.
 * A message saying something arrived is not a confirmed delivery.
 * A stock remark is not an inventory posting.
 *
 * This module does not edit reported-operational-fact.ts and does not weaken it.
 * Confirmation cannot be completed here. Manual still requires provenance.
 * Order and order-line ids are opaque. This is not a department ERP.
 *
 * Payment is not a universal gate before a pedido proceeds.
 * A distributor agreement is one accepted basis. Official accounting stays external.
 * A release decision does not confirm a payment, and paymentConfirmed is not a gate.
 *
 * CROSS_LANE_CHANGE_REQUEST (Worker 4):
 * - export this file from packages/os-contracts/src/index.ts
 * - paste packages/os-database/prisma/fragments/operational-case.prisma into schema.prisma
 *   and add the OsOrganization inverse fields named in that fragment
 * - do not register these commands as finance confirmation, stock posting,
 *   or delivery authorization
 * - do not add a foreign key from order_id or order_line_id to commercial tables
 * - do not number delivery notes from this case
 * - do not add paymentConfirmed as a gate on order create or proceed
 */

export const OPERATIONAL_CASE_CONFIRMATION = 'pending' as const;
export const OPERATIONAL_CASE_CANONICAL_EFFECT = 'none' as const;

export const OPERATIONAL_CASE_FACT_SOURCES = ['manual', 'customer_message'] as const;
export type OperationalCaseFactSource = (typeof OPERATIONAL_CASE_FACT_SOURCES)[number];

export const OPERATIONAL_CASE_FACT_KINDS = [
  'payment_report',
  'delivery_report',
  'stock_report',
  'note',
] as const;
export type OperationalCaseFactKind = (typeof OPERATIONAL_CASE_FACT_KINDS)[number];

export const OPERATIONAL_RELEASE_STATES = ['released', 'held'] as const;
export type OperationalReleaseState = (typeof OPERATIONAL_RELEASE_STATES)[number];

/** Not a complete exception catalog. Other authorized reasons stay free text. */
export const OPERATIONAL_RELEASE_BASES = [
  'payment_verified',
  'commercial_agreement',
  'authorized_other',
] as const;
export type OperationalReleaseBasis = (typeof OPERATIONAL_RELEASE_BASES)[number];

/** A customer message cannot release a pedido. Manual still requires provenance. */
export const OPERATIONAL_RELEASE_SOURCE = 'manual' as const;

export const OPERATIONAL_CASE_COMMANDS = [
  'OpenOperationalCase',
  'RecordOperationalCaseFact',
  'ReverseOperationalCaseFact',
  'RecordOperationalReleaseDecision',
  'ReverseOperationalReleaseDecision',
] as const;

export const OPERATIONAL_RELEASE_COLUMNS = [
  'id',
  'organization_id',
  'case_id',
  'order_id',
  'state',
  'basis',
  'reason',
  'source',
  'actor_member_id',
  'actor_label',
  'decided_at',
  'recorded_at',
  'evidence_text',
  'evidence_reference',
  'corrects_decision_id',
  'idempotency_key',
  'created_at',
] as const;

export const OPERATIONAL_CASE_FACT_COLUMNS = [
  'id',
  'organization_id',
  'case_id',
  'order_id',
  'order_line_id',
  'kind',
  'source',
  'actor_member_id',
  'actor_label',
  'occurred_at',
  'recorded_at',
  'evidence_text',
  'evidence_reference',
  'confirmation',
  'payload_json',
  'corrects_fact_id',
  'idempotency_key',
  'created_at',
] as const;

const FORBIDDEN_INPUT_KEYS = [
  'confirmation',
  'confirmed',
  'confirmedAt',
  'confirmed_at',
  'paidAt',
  'paid_at',
  'deliveredAt',
  'delivered_at',
  'deliveryNoteNumber',
  'delivery_note_number',
  'invoiceId',
  'ledgerEntryId',
  'inventoryMovementId',
  'warehouseId',
  'department',
  'orderStatus',
  'canonicalEffect',
  'paymentConfirmed',
  'payment_confirmed',
] as const;

const FORBIDDEN_PAYLOAD_KEYS = [
  'confirmed',
  'confirmed_at',
  'paid_at',
  'delivered_at',
  'delivery_note_number',
  'invoice_id',
  'ledger_entry_id',
  'inventory_movement_id',
  'warehouse_id',
  'department',
  'paymentConfirmed',
  'payment_confirmed',
] as const;

const optionalText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const ActorSchema = z
  .object({
    memberId: optionalText,
    label: z.string().trim().min(1),
  })
  .strict();

const EvidenceSchema = z
  .object({
    text: z.string().trim().min(1),
    reference: optionalText,
  })
  .strict();

const OpenCaseSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    orderId: z.string().trim().min(1),
    openedAt: z.string().datetime(),
    openedBy: ActorSchema,
    createdAt: z.string().datetime(),
  })
  .strict();

const RecordFactSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    caseId: z.string().trim().min(1),
    orderId: z.string().trim().min(1),
    orderLineId: optionalText,
    kind: z.enum(OPERATIONAL_CASE_FACT_KINDS),
    source: z.enum(OPERATIONAL_CASE_FACT_SOURCES),
    actor: ActorSchema,
    occurredAt: z.string().datetime(),
    recordedAt: z.string().datetime(),
    evidence: EvidenceSchema,
    payload: z.record(z.string(), z.string()).optional(),
    correctsFactId: optionalText,
    idempotencyKey: optionalText,
    createdAt: z.string().datetime(),
  })
  .strict();

const ReverseFactSchema = z
  .object({
    id: z.string().trim().min(1),
    factId: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    reason: z.string().trim().min(1),
    actor: ActorSchema,
    recordedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type OperationalCase = {
  id: string;
  organization_id: string;
  order_id: string;
  opened_at: string;
  opened_by_member_id: string | null;
  opened_by_label: string;
  created_at: string;
};

export type OperationalCaseFact = {
  id: string;
  organization_id: string;
  case_id: string;
  order_id: string;
  order_line_id: string | null;
  kind: OperationalCaseFactKind;
  source: OperationalCaseFactSource;
  actor_member_id: string | null;
  actor_label: string;
  occurred_at: string;
  recorded_at: string;
  evidence_text: string;
  evidence_reference: string | null;
  confirmation: typeof OPERATIONAL_CASE_CONFIRMATION;
  payload_json: Record<string, string>;
  corrects_fact_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  canonical_effect: typeof OPERATIONAL_CASE_CANONICAL_EFFECT;
};

export type OperationalCaseFactReversal = {
  id: string;
  organization_id: string;
  fact_id: string;
  reason: string;
  actor_member_id: string | null;
  actor_label: string;
  recorded_at: string;
  created_at: string;
};

export type OperationalReleaseDecision = {
  id: string;
  organization_id: string;
  case_id: string;
  order_id: string;
  state: OperationalReleaseState;
  basis: OperationalReleaseBasis;
  reason: string;
  source: typeof OPERATIONAL_RELEASE_SOURCE;
  actor_member_id: string | null;
  actor_label: string;
  decided_at: string;
  recorded_at: string;
  evidence_text: string;
  evidence_reference: string | null;
  corrects_decision_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  canonical_effect: typeof OPERATIONAL_CASE_CANONICAL_EFFECT;
};

export type OperationalReleaseReversal = {
  id: string;
  organization_id: string;
  decision_id: string;
  reason: string;
  actor_member_id: string | null;
  actor_label: string;
  recorded_at: string;
  created_at: string;
};

export type OperationalCaseLedger = {
  cases: readonly OperationalCase[];
  facts: readonly OperationalCaseFact[];
  reversals: readonly OperationalCaseFactReversal[];
  releases: readonly OperationalReleaseDecision[];
  releaseReversals: readonly OperationalReleaseReversal[];
};

export type OperationalCaseFailure =
  | 'provenance_required'
  | 'tenant_mismatch'
  | 'order_mismatch'
  | 'case_not_found'
  | 'fact_not_found'
  | 'decision_not_found'
  | 'confirmation_refused'
  | 'already_reversed'
  | 'correction_mismatch'
  | 'idempotency_conflict'
  | 'invalid_payload'
  | 'source_not_authorized';

export type OperationalCaseResult<T> =
  | { ok: true; ledger: OperationalCaseLedger; value: T; replayed: boolean }
  | { ok: false; reason: OperationalCaseFailure };

export function emptyOperationalCaseLedger(): OperationalCaseLedger {
  return { cases: [], facts: [], reversals: [], releases: [], releaseReversals: [] };
}

export function operationalCaseFactMayConfirmPayment(): false {
  return false;
}

export function operationalCaseFactMayConfirmDelivery(): false {
  return false;
}

export function operationalCaseFactMayConfirmStock(): false {
  return false;
}

/** A message, including a customer saying they paid or that it arrived, cannot confirm the case. */
export function messageMayConfirmOperationalCase(): false {
  return false;
}

/** Citing a reviewed payment, or releasing the pedido, does not confirm the payment. */
export function releaseDecisionMayConfirmPayment(): false {
  return false;
}

/**
 * Payment is not required before a pedido proceeds.
 * Do not use this as a production gate, and do not read paymentConfirmed here.
 */
export function operationalReleaseRequiresConfirmedPayment(): false {
  return false;
}

function refused(input: object): boolean {
  return FORBIDDEN_INPUT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(input, key));
}

function cleanPayload(
  kind: OperationalCaseFactKind,
  payload: Record<string, string> | undefined,
): Record<string, string> | 'forbidden' | 'invalid' {
  const source = payload ?? {};
  if (FORBIDDEN_PAYLOAD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(source, key))) {
    return 'forbidden';
  }
  const amount = source.amountCentavos?.trim();
  const currency = source.currency?.trim();
  const quantity = source.reportedQuantity?.trim();
  const unit = source.unit?.trim();
  const allowed =
    kind === 'payment_report'
      ? ['amountCentavos', 'currency']
      : kind === 'stock_report'
        ? ['reportedQuantity', 'unit']
        : [];
  const unexpected = Object.keys(source).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) return 'invalid';
  if (kind === 'payment_report' && amount && !/^[1-9]\d*$/.test(amount)) return 'invalid';
  if (kind === 'stock_report' && quantity && !/^(0|[1-9]\d*)$/.test(quantity)) return 'invalid';
  const next: Record<string, string> = {};
  if (kind === 'payment_report' && amount) {
    next.amountCentavos = amount;
    if (currency) next.currency = currency;
  }
  if (kind === 'stock_report' && quantity) {
    next.reportedQuantity = quantity;
    if (unit) next.unit = unit;
  }
  return next;
}

export function openOperationalCase(
  ledger: OperationalCaseLedger,
  input: z.input<typeof OpenCaseSchema>,
): OperationalCaseResult<OperationalCase> {
  if (refused(input)) return { ok: false, reason: 'confirmation_refused' };
  const parsed = OpenCaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'provenance_required' };

  const existing = ledger.cases.find(
    (item) =>
      item.organization_id === parsed.data.organizationId && item.order_id === parsed.data.orderId,
  );
  if (existing) return { ok: true, ledger, value: existing, replayed: true };

  const opened: OperationalCase = {
    id: parsed.data.id,
    organization_id: parsed.data.organizationId,
    order_id: parsed.data.orderId,
    opened_at: parsed.data.openedAt,
    opened_by_member_id: parsed.data.openedBy.memberId,
    opened_by_label: parsed.data.openedBy.label,
    created_at: parsed.data.createdAt,
  };
  return {
    ok: true,
    ledger: { ...ledger, cases: [...ledger.cases, opened] },
    value: opened,
    replayed: false,
  };
}

export function recordOperationalCaseFact(
  ledger: OperationalCaseLedger,
  input: z.input<typeof RecordFactSchema>,
): OperationalCaseResult<OperationalCaseFact> {
  if (refused(input)) return { ok: false, reason: 'confirmation_refused' };
  const parsed = RecordFactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'provenance_required' };

  const operationalCase = ledger.cases.find((item) => item.id === parsed.data.caseId);
  if (!operationalCase) return { ok: false, reason: 'case_not_found' };
  if (operationalCase.organization_id !== parsed.data.organizationId) {
    return { ok: false, reason: 'tenant_mismatch' };
  }
  if (operationalCase.order_id !== parsed.data.orderId) {
    return { ok: false, reason: 'order_mismatch' };
  }

  if (parsed.data.idempotencyKey) {
    const prior = ledger.facts.find(
      (item) =>
        item.organization_id === parsed.data.organizationId &&
        item.idempotency_key === parsed.data.idempotencyKey,
    );
    if (prior) {
      if (prior.order_id !== parsed.data.orderId || prior.case_id !== parsed.data.caseId) {
        return { ok: false, reason: 'idempotency_conflict' };
      }
      return { ok: true, ledger, value: prior, replayed: true };
    }
  }

  if (parsed.data.correctsFactId) {
    const prior = ledger.facts.find((item) => item.id === parsed.data.correctsFactId);
    if (
      !prior ||
      prior.organization_id !== parsed.data.organizationId ||
      prior.order_id !== parsed.data.orderId ||
      prior.case_id !== parsed.data.caseId
    ) {
      return { ok: false, reason: 'correction_mismatch' };
    }
  }

  const payload = cleanPayload(parsed.data.kind, parsed.data.payload);
  if (payload === 'forbidden') return { ok: false, reason: 'confirmation_refused' };
  if (payload === 'invalid') return { ok: false, reason: 'invalid_payload' };

  const fact: OperationalCaseFact = {
    id: parsed.data.id,
    organization_id: parsed.data.organizationId,
    case_id: parsed.data.caseId,
    order_id: parsed.data.orderId,
    order_line_id: parsed.data.orderLineId,
    kind: parsed.data.kind,
    source: parsed.data.source,
    actor_member_id: parsed.data.actor.memberId,
    actor_label: parsed.data.actor.label,
    occurred_at: parsed.data.occurredAt,
    recorded_at: parsed.data.recordedAt,
    evidence_text: parsed.data.evidence.text,
    evidence_reference: parsed.data.evidence.reference,
    confirmation: OPERATIONAL_CASE_CONFIRMATION,
    payload_json: payload,
    corrects_fact_id: parsed.data.correctsFactId,
    idempotency_key: parsed.data.idempotencyKey,
    created_at: parsed.data.createdAt,
    canonical_effect: OPERATIONAL_CASE_CANONICAL_EFFECT,
  };

  return {
    ok: true,
    ledger: { ...ledger, facts: [...ledger.facts, fact] },
    value: fact,
    replayed: false,
  };
}

/**
 * Appends a reversal. The fact row is not rewritten.
 * A second reversal is refused so history is not overwritten.
 */
export function reverseOperationalCaseFact(
  ledger: OperationalCaseLedger,
  input: z.input<typeof ReverseFactSchema>,
): OperationalCaseResult<OperationalCaseFactReversal> {
  if (refused(input)) return { ok: false, reason: 'confirmation_refused' };
  const parsed = ReverseFactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'provenance_required' };

  const fact = ledger.facts.find((item) => item.id === parsed.data.factId);
  if (!fact) return { ok: false, reason: 'fact_not_found' };
  if (fact.organization_id !== parsed.data.organizationId) {
    return { ok: false, reason: 'tenant_mismatch' };
  }
  if (ledger.reversals.some((item) => item.fact_id === fact.id)) {
    return { ok: false, reason: 'already_reversed' };
  }

  const reversal: OperationalCaseFactReversal = {
    id: parsed.data.id,
    organization_id: parsed.data.organizationId,
    fact_id: fact.id,
    reason: parsed.data.reason,
    actor_member_id: parsed.data.actor.memberId,
    actor_label: parsed.data.actor.label,
    recorded_at: parsed.data.recordedAt,
    created_at: parsed.data.createdAt,
  };

  return {
    ok: true,
    ledger: { ...ledger, facts: ledger.facts, reversals: [...ledger.reversals, reversal] },
    value: reversal,
    replayed: false,
  };
}

export type OperationalCaseFactHistory = {
  fact: OperationalCaseFact;
  reversal: OperationalCaseFactReversal | null;
};

/** Facts for one order in one organization. Reversed facts stay in the list. */
export function listOperationalCaseFactsForOrder(
  ledger: OperationalCaseLedger,
  input: { organizationId: string; orderId: string },
): OperationalCaseFactHistory[] {
  const organizationId = input.organizationId.trim();
  const orderId = input.orderId.trim();
  if (!organizationId || !orderId) return [];

  return ledger.facts
    .filter((fact) => fact.organization_id === organizationId && fact.order_id === orderId)
    .map((fact) => ({
      fact,
      reversal: ledger.reversals.find(
        (item) => item.fact_id === fact.id && item.organization_id === organizationId,
      ) ?? null,
    }))
    .sort((left, right) => {
      const byTime = left.fact.recorded_at.localeCompare(right.fact.recorded_at);
      return byTime === 0 ? left.fact.id.localeCompare(right.fact.id) : byTime;
    });
}

const RecordReleaseSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    caseId: z.string().trim().min(1),
    orderId: z.string().trim().min(1),
    state: z.enum(OPERATIONAL_RELEASE_STATES),
    basis: z.enum(OPERATIONAL_RELEASE_BASES),
    reason: z.string().trim().min(1),
    source: z.literal(OPERATIONAL_RELEASE_SOURCE),
    actor: ActorSchema,
    decidedAt: z.string().datetime(),
    recordedAt: z.string().datetime(),
    evidence: EvidenceSchema,
    correctsDecisionId: optionalText,
    idempotencyKey: optionalText,
    createdAt: z.string().datetime(),
  })
  .strict();

const ReverseReleaseSchema = z
  .object({
    id: z.string().trim().min(1),
    decisionId: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    reason: z.string().trim().min(1),
    actor: ActorSchema,
    recordedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  })
  .strict();

function sameCaseOrder(
  operationalCase: OperationalCase,
  organizationId: string,
  orderId: string,
  caseId: string,
): OperationalCaseFailure | null {
  if (operationalCase.id !== caseId) return 'case_not_found';
  if (operationalCase.organization_id !== organizationId) return 'tenant_mismatch';
  if (operationalCase.order_id !== orderId) return 'order_mismatch';
  return null;
}

/**
 * Records an operational release decision.
 * Does not read payment confirmation and does not write it.
 * A commercial agreement is enough. A cited payment review is not a confirmed payment.
 */
export function recordOperationalReleaseDecision(
  ledger: OperationalCaseLedger,
  input: z.input<typeof RecordReleaseSchema>,
): OperationalCaseResult<OperationalReleaseDecision> {
  if (refused(input)) return { ok: false, reason: 'confirmation_refused' };
  const rawSource =
    input && typeof input === 'object' && 'source' in input
      ? (input as { source?: unknown }).source
      : undefined;
  if (rawSource === 'customer_message') {
    return { ok: false, reason: 'source_not_authorized' };
  }
  const parsed = RecordReleaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'provenance_required' };

  const operationalCase = ledger.cases.find((item) => item.id === parsed.data.caseId);
  if (!operationalCase) return { ok: false, reason: 'case_not_found' };
  const scope = sameCaseOrder(
    operationalCase,
    parsed.data.organizationId,
    parsed.data.orderId,
    parsed.data.caseId,
  );
  if (scope) return { ok: false, reason: scope };

  if (parsed.data.idempotencyKey) {
    const prior = ledger.releases.find(
      (item) =>
        item.organization_id === parsed.data.organizationId &&
        item.idempotency_key === parsed.data.idempotencyKey,
    );
    if (prior) {
      if (prior.order_id !== parsed.data.orderId || prior.case_id !== parsed.data.caseId) {
        return { ok: false, reason: 'idempotency_conflict' };
      }
      return { ok: true, ledger, value: prior, replayed: true };
    }
  }

  if (parsed.data.correctsDecisionId) {
    const prior = ledger.releases.find((item) => item.id === parsed.data.correctsDecisionId);
    if (
      !prior ||
      prior.organization_id !== parsed.data.organizationId ||
      prior.order_id !== parsed.data.orderId ||
      prior.case_id !== parsed.data.caseId
    ) {
      return { ok: false, reason: 'correction_mismatch' };
    }
  }

  const decision: OperationalReleaseDecision = {
    id: parsed.data.id,
    organization_id: parsed.data.organizationId,
    case_id: parsed.data.caseId,
    order_id: parsed.data.orderId,
    state: parsed.data.state,
    basis: parsed.data.basis,
    reason: parsed.data.reason,
    source: OPERATIONAL_RELEASE_SOURCE,
    actor_member_id: parsed.data.actor.memberId,
    actor_label: parsed.data.actor.label,
    decided_at: parsed.data.decidedAt,
    recorded_at: parsed.data.recordedAt,
    evidence_text: parsed.data.evidence.text,
    evidence_reference: parsed.data.evidence.reference,
    corrects_decision_id: parsed.data.correctsDecisionId,
    idempotency_key: parsed.data.idempotencyKey,
    created_at: parsed.data.createdAt,
    canonical_effect: OPERATIONAL_CASE_CANONICAL_EFFECT,
  };

  return {
    ok: true,
    ledger: {
      ...ledger,
      facts: ledger.facts,
      releases: [...ledger.releases, decision],
    },
    value: decision,
    replayed: false,
  };
}

/** Appends a reversal. The release decision is not rewritten and the payment stays unconfirmed. */
export function reverseOperationalReleaseDecision(
  ledger: OperationalCaseLedger,
  input: z.input<typeof ReverseReleaseSchema>,
): OperationalCaseResult<OperationalReleaseReversal> {
  if (refused(input)) return { ok: false, reason: 'confirmation_refused' };
  const parsed = ReverseReleaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'provenance_required' };

  const decision = ledger.releases.find((item) => item.id === parsed.data.decisionId);
  if (!decision) return { ok: false, reason: 'decision_not_found' };
  if (decision.organization_id !== parsed.data.organizationId) {
    return { ok: false, reason: 'tenant_mismatch' };
  }
  if (ledger.releaseReversals.some((item) => item.decision_id === decision.id)) {
    return { ok: false, reason: 'already_reversed' };
  }

  const reversal: OperationalReleaseReversal = {
    id: parsed.data.id,
    organization_id: parsed.data.organizationId,
    decision_id: decision.id,
    reason: parsed.data.reason,
    actor_member_id: parsed.data.actor.memberId,
    actor_label: parsed.data.actor.label,
    recorded_at: parsed.data.recordedAt,
    created_at: parsed.data.createdAt,
  };

  return {
    ok: true,
    ledger: {
      ...ledger,
      facts: ledger.facts,
      releases: ledger.releases,
      releaseReversals: [...ledger.releaseReversals, reversal],
    },
    value: reversal,
    replayed: false,
  };
}

export type OperationalReleaseHistory = {
  decision: OperationalReleaseDecision;
  reversal: OperationalReleaseReversal | null;
};

/** Release history for one order. Does not check payment and does not drop reversed decisions. */
export function listOperationalReleasesForOrder(
  ledger: OperationalCaseLedger,
  input: { organizationId: string; orderId: string },
): OperationalReleaseHistory[] {
  const organizationId = input.organizationId.trim();
  const orderId = input.orderId.trim();
  if (!organizationId || !orderId) return [];

  return ledger.releases
    .filter((item) => item.organization_id === organizationId && item.order_id === orderId)
    .map((decision) => ({
      decision,
      reversal:
        ledger.releaseReversals.find(
          (item) => item.decision_id === decision.id && item.organization_id === organizationId,
        ) ?? null,
    }))
    .sort((left, right) => {
      const byTime = left.decision.recorded_at.localeCompare(right.decision.recorded_at);
      return byTime === 0 ? left.decision.id.localeCompare(right.decision.id) : byTime;
    });
}
