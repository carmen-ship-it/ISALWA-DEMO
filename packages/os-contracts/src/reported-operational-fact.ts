import { z } from 'zod';

/**
 * A reported operational fact is not canonical truth.
 *
 * Payment reported is not a confirmed payment.
 * Dispatch reported is not authoritative logistics.
 * A stock snapshot is not an inventory ledger.
 *
 * This module does not mutate quotes, orders, parties, locations, or payments.
 * Confirmation cannot be completed here. The persistence row stays pending.
 *
 * CROSS_LANE_CHANGE_REQUEST (Worker 4): export this file from
 * packages/os-contracts/src/index.ts. Do not register these commands as
 * finance confirmation, dispatch authorization, or inventory posting.
 */

export const REPORTED_FACT_SOURCE = 'manual' as const;
export const REPORTED_FACT_CONFIRMATION = 'pending' as const;
export const REPORTED_FACT_CANONICAL_EFFECT = 'none' as const;

export const REPORTED_FACT_KINDS = ['payment', 'dispatch', 'stock'] as const;
export type ReportedFactKind = (typeof REPORTED_FACT_KINDS)[number];

export const REPORTED_FACT_SUBJECT_TYPES = ['party', 'quote', 'order', 'item'] as const;
export type ReportedFactSubjectType = (typeof REPORTED_FACT_SUBJECT_TYPES)[number];

export const REPORTED_FACT_ACTIVITIES = ['active', 'reversed'] as const;
export type ReportedFactActivity = (typeof REPORTED_FACT_ACTIVITIES)[number];

export const REPORTED_FACT_COMMANDS = [
  'RecordReportedOperationalFact',
  'ReverseReportedOperationalFact',
] as const;

/** Columns this table may store. Subject ids are opaque references, not mutations. */
export const REPORTED_FACT_ROW_COLUMNS = [
  'id',
  'organization_id',
  'kind',
  'subject_type',
  'subject_id',
  'reported_at',
  'reported_by_member_id',
  'reported_by_label',
  'source',
  'confirmation',
  'activity',
  'reversal_reason',
  'source_reference',
  'note',
  'payload_json',
  'corrects_fact_id',
  'idempotency_key',
  'created_at',
] as const;

const FORBIDDEN_ROW_KEYS = [
  'confirmed_at',
  'paid_at',
  'dispatched_at',
  'latitude',
  'longitude',
  'ledger_entry_id',
  'inventory_movement_id',
  'order_status',
  'quote_status',
] as const;

const optionalText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const PaymentPayloadSchema = z.object({
  amountCentavos: z.string().regex(/^[1-9]\d*$/),
  currency: z.string().trim().min(1).default('BOB'),
  method: optionalText,
});

const DispatchPayloadSchema = z.object({
  reportedState: z.string().trim().min(1),
});

const StockPayloadSchema = z.object({
  itemLabel: z.string().trim().min(1),
  quantity: z.string().regex(/^(0|[1-9]\d*)$/),
  unit: z.string().trim().min(1).default('unidades'),
});

const RecordBaseSchema = z.object({
  id: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  subjectType: z.enum(REPORTED_FACT_SUBJECT_TYPES),
  subjectId: z.string().trim().min(1),
  reportedAt: z.string().datetime(),
  reportedByLabel: z.string().trim().min(1),
  reportedByMemberId: optionalText,
  sourceReference: optionalText,
  note: optionalText,
  idempotencyKey: optionalText,
  correctsFactId: optionalText,
});

export const RecordReportedOperationalFactSchema = z.discriminatedUnion('kind', [
  RecordBaseSchema.extend({ kind: z.literal('payment'), payload: PaymentPayloadSchema }),
  RecordBaseSchema.extend({ kind: z.literal('dispatch'), payload: DispatchPayloadSchema }),
  RecordBaseSchema.extend({ kind: z.literal('stock'), payload: StockPayloadSchema }),
]);

export type RecordReportedOperationalFactInput = z.input<typeof RecordReportedOperationalFactSchema>;

export const ReverseReportedOperationalFactSchema = z.object({
  factId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  reason: z.string().trim().min(1),
});

export type ReportedOperationalFactRow = {
  id: string;
  organization_id: string;
  kind: ReportedFactKind;
  subject_type: ReportedFactSubjectType;
  subject_id: string;
  reported_at: string;
  reported_by_member_id: string | null;
  reported_by_label: string;
  source: typeof REPORTED_FACT_SOURCE;
  confirmation: typeof REPORTED_FACT_CONFIRMATION;
  activity: ReportedFactActivity;
  reversal_reason: string | null;
  source_reference: string | null;
  note: string | null;
  payload_json: Record<string, string | null>;
  corrects_fact_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  canonical_effect: typeof REPORTED_FACT_CANONICAL_EFFECT;
};

function assertRowShape(row: ReportedOperationalFactRow): void {
  const keys = Object.keys(row);
  for (const forbidden of FORBIDDEN_ROW_KEYS) {
    if (keys.includes(forbidden)) {
      throw new Error('A reported fact cannot store canonical confirmation fields');
    }
  }
  if (row.source !== REPORTED_FACT_SOURCE || row.confirmation !== REPORTED_FACT_CONFIRMATION) {
    throw new Error('A reported fact stays source=manual and confirmation pending');
  }
  if (row.canonical_effect !== REPORTED_FACT_CANONICAL_EFFECT) {
    throw new Error('A reported fact does not mutate canonical records');
  }
}

/** Absent optional fields stay null. Undefined is not stored and does not confirm the report. */
function reportedFactPayload(
  parsed: z.output<typeof RecordReportedOperationalFactSchema>,
): Record<string, string | null> {
  const fields: Record<string, string | null | undefined> =
    parsed.kind === 'payment'
      ? {
          amountCentavos: parsed.payload.amountCentavos,
          currency: parsed.payload.currency,
          method: parsed.payload.method,
        }
      : parsed.kind === 'dispatch'
        ? { reportedState: parsed.payload.reportedState }
        : {
            itemLabel: parsed.payload.itemLabel,
            quantity: parsed.payload.quantity,
            unit: parsed.payload.unit,
          };

  const payload: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    payload[key] = value ?? null;
  }
  return payload;
}

/** Builds an insert row. Ignores any attempt to pass source or confirmation. */
export function buildReportedOperationalFactRow(
  input: RecordReportedOperationalFactInput,
  createdAt: string,
): ReportedOperationalFactRow {
  const parsed = RecordReportedOperationalFactSchema.parse(input);
  if (Number.isNaN(new Date(createdAt).getTime())) {
    throw new Error('createdAt must be a valid timestamp');
  }

  const payload = reportedFactPayload(parsed);

  const row: ReportedOperationalFactRow = {
    id: parsed.id,
    organization_id: parsed.organizationId,
    kind: parsed.kind,
    subject_type: parsed.subjectType,
    subject_id: parsed.subjectId,
    reported_at: parsed.reportedAt,
    reported_by_member_id: parsed.reportedByMemberId,
    reported_by_label: parsed.reportedByLabel,
    source: REPORTED_FACT_SOURCE,
    confirmation: REPORTED_FACT_CONFIRMATION,
    activity: 'active',
    reversal_reason: null,
    source_reference: parsed.sourceReference,
    note: parsed.note,
    payload_json: payload,
    corrects_fact_id: parsed.correctsFactId,
    idempotency_key: parsed.idempotencyKey,
    created_at: createdAt,
    canonical_effect: REPORTED_FACT_CANONICAL_EFFECT,
  };
  assertRowShape(row);
  return row;
}

/**
 * Marks the report reversed. Does not rewrite the payload and does not confirm it.
 * Does not update the subject record.
 */
export function reverseReportedOperationalFactRow(
  row: ReportedOperationalFactRow,
  input: z.input<typeof ReverseReportedOperationalFactSchema>,
): ReportedOperationalFactRow {
  const parsed = ReverseReportedOperationalFactSchema.parse(input);
  assertRowShape(row);
  if (row.id !== parsed.factId || row.organization_id !== parsed.organizationId) {
    throw new Error('Reversal must name the same report in the same organization');
  }
  if (row.activity === 'reversed') {
    throw new Error('The report is already reversed. The reported value is not overwritten.');
  }
  const reversed: ReportedOperationalFactRow = {
    ...row,
    activity: 'reversed',
    reversal_reason: parsed.reason,
    source: REPORTED_FACT_SOURCE,
    confirmation: REPORTED_FACT_CONFIRMATION,
    canonical_effect: REPORTED_FACT_CANONICAL_EFFECT,
  };
  assertRowShape(reversed);
  return reversed;
}

export function reportedFactMayConfirmPayment(): false {
  return false;
}

export function reportedFactMayAuthorizeDispatch(): false {
  return false;
}

export function reportedFactMayPostInventory(): false {
  return false;
}

export function reportedFactMayMutateCanonical(): false {
  return false;
}
