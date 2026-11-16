import { z } from 'zod';
import { COMMERCIAL_CURRENCIES, OPPORTUNITY_STATUSES } from './commercial-events';

export const COMMERCIAL_COMMAND_NAMES = [
  'CreateOpportunity',
  'UpdateOpportunity',
  'ChangeOpportunityStage',
  'CloseOpportunity',
  'AssignOpportunityOwner',
  'CreateQuote',
  'AddQuoteLine',
  'UpdateQuoteLine',
  'RemoveQuoteLine',
  'UpdateQuote',
  'SubmitQuote',
  'RecordQuoteManualSend',
  'RecordQuoteCustomerAcceptance',
  'CancelQuote',
  'CreateOrder',
  'CancelOrder',
  'ReassignCommercialAccountOwner',
  'GrantCustomerCoverage',
  'RevokeCustomerCoverage',
] as const;

export type CommercialCommandName = (typeof COMMERCIAL_COMMAND_NAMES)[number];

const centavosSchema = z.union([
  z.string().regex(/^-?\d+$/),
  z.number().int(),
  z.bigint(),
]);

const positiveQuantitySchema = z.number().int().min(1);

export const CreateOpportunityPayloadSchema = z.object({
  partyId: z.string().min(1),
  title: z.string().min(1),
  stage: z.string().min(1).optional(),
  expectedValueCentavos: centavosSchema.optional(),
  sourceMetadata: z.record(z.unknown()).optional(),
  ownerMemberId: z.string().min(1).optional(),
});

export const UpdateOpportunityPayloadSchema = z.object({
  opportunityId: z.string().min(1),
  title: z.string().min(1).optional(),
  expectedValueCentavos: centavosSchema.nullable().optional(),
  sourceMetadata: z.record(z.unknown()).nullable().optional(),
});

export const ChangeOpportunityStagePayloadSchema = z.object({
  opportunityId: z.string().min(1),
  stage: z.string().min(1),
});

export const CloseOpportunityPayloadSchema = z.object({
  opportunityId: z.string().min(1),
  outcome: z.enum(['won', 'lost']),
});

export const AssignOpportunityOwnerPayloadSchema = z.object({
  opportunityId: z.string().min(1),
  ownerMemberId: z.string().min(1),
});

export const CreateQuotePayloadSchema = z.object({
  partyId: z.string().min(1),
  opportunityId: z.string().min(1).optional(),
  currency: z.enum(COMMERCIAL_CURRENCIES).optional(),
  notes: z.string().optional(),
  ownerMemberId: z.string().min(1).optional(),
});

export const AddQuoteLinePayloadSchema = z.object({
  quoteId: z.string().min(1),
  description: z.string().min(1),
  quantity: positiveQuantitySchema,
  unitLabel: z.string().optional(),
  unitPriceCentavos: centavosSchema,
  discountCentavos: centavosSchema.optional(),
  productRef: z.string().optional(),
});

export const UpdateQuoteLinePayloadSchema = z.object({
  quoteLineId: z.string().min(1),
  description: z.string().min(1).optional(),
  quantity: positiveQuantitySchema.optional(),
  unitLabel: z.string().nullable().optional(),
  unitPriceCentavos: centavosSchema.optional(),
  discountCentavos: centavosSchema.optional(),
  productRef: z.string().nullable().optional(),
});

export const RemoveQuoteLinePayloadSchema = z.object({
  quoteLineId: z.string().min(1),
});

export const UpdateQuotePayloadSchema = z.object({
  quoteId: z.string().min(1),
  notes: z.string().nullable().optional(),
  headerDiscountCentavos: centavosSchema.optional(),
  /** Explicit validity end (ISO date or datetime). null clears it. Part of the exact terms an approval binds. */
  validUntil: z.string().min(1).nullable().optional(),
});

export const SubmitQuotePayloadSchema = z.object({
  quoteId: z.string().min(1),
});

/** Human evidence that a quote was sent outside ISALWA. Does not call a provider. */
export const QUOTE_MANUAL_SEND_CHANNELS = ['whatsapp', 'email', 'otro'] as const;
export type QuoteManualSendChannel = (typeof QUOTE_MANUAL_SEND_CHANNELS)[number];

export const RecordQuoteManualSendPayloadSchema = z.object({
  quoteId: z.string().min(1),
  channel: z.enum(QUOTE_MANUAL_SEND_CHANNELS),
  note: z.string().max(2000).optional(),
});

/**
 * Human-entered customer acceptance of one issued quote revision. A delivery or
 * read receipt is not acceptance; evidence is mandatory free text.
 */
export const QUOTE_ACCEPTANCE_CHANNELS = ['whatsapp', 'llamada', 'visita', 'presencial', 'otro'] as const;
export type QuoteAcceptanceChannel = (typeof QUOTE_ACCEPTANCE_CHANNELS)[number];

export const RecordQuoteCustomerAcceptancePayloadSchema = z.object({
  quoteId: z.string().min(1),
  channel: z.enum(QUOTE_ACCEPTANCE_CHANNELS),
  /** Calendar date (YYYY-MM-DD) on which the customer accepted. */
  acceptedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  evidence: z.string().trim().min(10).max(500),
  expectedRevision: z.number().int().min(1),
});

export const CancelQuotePayloadSchema = z.object({
  quoteId: z.string().min(1),
  reason: z.string().optional(),
});

export const CreateOrderPayloadSchema = z.object({
  quoteId: z.string().min(1),
});

export const CancelOrderPayloadSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
});

export const ReassignCommercialAccountOwnerPayloadSchema = z.object({
  commercialAccountId: z.string().min(1),
  ownerMemberId: z.string().min(1),
});

/** Temporary coverage on existing CustomerCoverageGrant model. Note is audit-only (no schema column). */
export const GrantCustomerCoveragePayloadSchema = z.object({
  commercialAccountId: z.string().min(1),
  actingAdvisorMemberId: z.string().min(1),
  /** Defaults to commercial.work. The service accepts only GRANTABLE_COVERAGE_ACTIONS. */
  coveredActions: z.array(z.string().min(1)).min(1).max(4).optional(),
  /** Defaults to now. At most COVERAGE_MAX_DURATION_DAYS ahead. */
  startsAt: z.string().datetime().optional(),
  /** Required: at most COVERAGE_MAX_DURATION_DAYS after startsAt. */
  endsAt: z.string().datetime(),
  note: z.string().max(2000).optional(),
});

export const RevokeCustomerCoveragePayloadSchema = z.object({
  grantId: z.string().min(1),
  note: z.string().max(2000).optional(),
});

export const COMMERCIAL_COMMAND_PAYLOAD_SCHEMAS: Record<CommercialCommandName, z.ZodTypeAny> = {
  CreateOpportunity: CreateOpportunityPayloadSchema,
  UpdateOpportunity: UpdateOpportunityPayloadSchema,
  ChangeOpportunityStage: ChangeOpportunityStagePayloadSchema,
  CloseOpportunity: CloseOpportunityPayloadSchema,
  AssignOpportunityOwner: AssignOpportunityOwnerPayloadSchema,
  CreateQuote: CreateQuotePayloadSchema,
  AddQuoteLine: AddQuoteLinePayloadSchema,
  UpdateQuoteLine: UpdateQuoteLinePayloadSchema,
  RemoveQuoteLine: RemoveQuoteLinePayloadSchema,
  UpdateQuote: UpdateQuotePayloadSchema,
  SubmitQuote: SubmitQuotePayloadSchema,
  RecordQuoteManualSend: RecordQuoteManualSendPayloadSchema,
  RecordQuoteCustomerAcceptance: RecordQuoteCustomerAcceptancePayloadSchema,
  CancelQuote: CancelQuotePayloadSchema,
  CreateOrder: CreateOrderPayloadSchema,
  CancelOrder: CancelOrderPayloadSchema,
  ReassignCommercialAccountOwner: ReassignCommercialAccountOwnerPayloadSchema,
  GrantCustomerCoverage: GrantCustomerCoveragePayloadSchema,
  RevokeCustomerCoverage: RevokeCustomerCoveragePayloadSchema,
};

export function isOpenOpportunityStatus(status: string): status is (typeof OPPORTUNITY_STATUSES)[number] {
  return status === 'open';
}
