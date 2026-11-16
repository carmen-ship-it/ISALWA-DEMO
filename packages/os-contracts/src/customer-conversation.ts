import { z } from 'zod';

/**
 * Provider-neutral customer conversation.
 * A manual record is evidence the company entered. It is not a webhook, a send, or a model call.
 * WhatsApp and OpenAI are not connected. Recording a WhatsApp channel does not connect the provider.
 * WhatsApp uses the corporate number of the sales advisor. That number was not provided.
 * The status stays WHATSAPP_NUMBER_PENDING. Do not invent a phone number.
 *
 * A message must not become a confirmed payment, confirmed stock, a delivery,
 * completed production, or an approved discount.
 *
 * CROSS_LANE_CHANGE_REQUEST: export this file from packages/os-contracts/src/index.ts.
 * Do not register the port as a WhatsApp webhook, an OpenAI call, or a confirmation command.
 * Merge prisma/fragments/customer-conversation.prisma into schema.prisma and add the
 * back-relation on OsOrganization. Do not add confirmation columns.
 */

/**
 * Stored channel values. `whatsapp` is a manual WhatsApp record the company typed or pasted.
 * `manual` is the legacy "other record" value. `call`, `visit` and `in_person` are attention
 * channels (Batch 5 "Registrar atención"). None of them connects a provider.
 */
export const CUSTOMER_CONVERSATION_CHANNELS = ['whatsapp', 'manual', 'call', 'visit', 'in_person'] as const;
export type CustomerConversationChannel = (typeof CUSTOMER_CONVERSATION_CHANNELS)[number];

/** Channels the "Registrar atención" form offers, in display order. */
export const ATTENTION_CHANNELS = ['call', 'visit', 'in_person', 'whatsapp'] as const;
export type AttentionChannel = (typeof ATTENTION_CHANNELS)[number];

export const ATTENTION_CHANNEL_LABELS: Record<CustomerConversationChannel, string> = {
  call: 'Llamada',
  visit: 'Visita',
  in_person: 'Atención presencial',
  whatsapp: 'Registro manual de WhatsApp',
  manual: 'Otro registro',
};

/** A reason is required for every channel that is not a legacy record. */
const REASON_REQUIRED_CHANNELS: readonly CustomerConversationChannel[] = ['call', 'visit', 'in_person'];

export const CUSTOMER_CONVERSATION_SOURCE = 'employee_entered' as const;
export const CUSTOMER_CONVERSATION_PROVENANCE = 'company_entered' as const;

/** Corporate WhatsApp number of the sales advisor. Not provided. Not a phone number. */
export const WHATSAPP_NUMBER_PENDING = 'WHATSAPP_NUMBER_PENDING' as const;

export const CUSTOMER_CONVERSATION_ROW_COLUMNS = [
  'id',
  'organization_id',
  'customer_id',
  'customer_label',
  'contact_label',
  'channel',
  'occurred_at',
  'entered_by_member_id',
  'entered_by_label',
  'summary',
  'pasted_evidence',
  'reason',
  'assigned_member_id',
  'assigned_label',
  'assigned_at',
  'next_step_commitment_id',
  'opportunity_id',
  'quote_id',
  'order_id',
  'customer_question',
  'commitment_candidate',
  'possible_requested_date',
  'next_action',
  'source',
  'provenance',
  'advisor_number_status',
  'created_at',
] as const;

const FORBIDDEN_ROW_KEYS = [
  'payment_confirmed',
  'stock_confirmed',
  'delivered',
  'production_complete',
  'discount_approved',
  'provider_message_id',
  'approved_at',
  'paid_at',
  'advisor_phone',
  'phone',
  'phone_e164',
  'whatsapp_number',
] as const;

const optionalText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Optional next step saved with the attention. It becomes a commitment through the
 * existing CreateEmployeeCommitment command. Owner and date are both required.
 */
export const ConversationNextStepSchema = z.object({
  description: z.string().trim().min(1),
  ownerMemberId: z.string().trim().min(1),
  dueDate: DateOnly,
});

export type ConversationNextStep = z.infer<typeof ConversationNextStepSchema>;

export const RecordCustomerConversationSchema = z.object({
  id: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  customerId: z.string().trim().min(1),
  customerLabel: z.string().trim().min(1),
  contactLabel: optionalText,
  channel: z.enum(CUSTOMER_CONVERSATION_CHANNELS),
  occurredAt: z.string().datetime(),
  enteredByMemberId: optionalText,
  enteredByLabel: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  pastedEvidence: optionalText,
  reason: optionalText,
  opportunityId: optionalText,
  quoteId: optionalText,
  orderId: optionalText,
  customerQuestion: optionalText,
  commitmentCandidate: optionalText,
  possibleRequestedDate: DateOnly.nullable().optional().transform((value) => value ?? null),
  nextAction: optionalText,
  nextStep: ConversationNextStepSchema.nullable().optional().transform((value) => value ?? null),
}).superRefine((value, ctx) => {
  if (REASON_REQUIRED_CHANNELS.includes(value.channel) && !value.reason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'reason_required' });
  }
});

export type RecordCustomerConversationInput = z.input<typeof RecordCustomerConversationSchema>;

export type CustomerConversationRefusal =
  | 'missing_tenant'
  | 'missing_customer'
  | 'missing_summary'
  | 'missing_reason'
  | 'missing_entered_by'
  | 'invalid_next_step'
  | 'invalid_occurred_at'
  | 'invalid_requested_date'
  | 'invalid_record';

export type ManualCustomerConversation = {
  id: string;
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel: string | null;
  channel: CustomerConversationChannel;
  occurredAt: string;
  enteredByMemberId: string | null;
  enteredByLabel: string;
  summary: string;
  pastedEvidence: string | null;
  /** Why the company attended the customer. Required for call, visit and in-person. */
  reason: string | null;
  /**
   * Who took the conversation. Not the account owner and not a commitment owner.
   * Only the take command writes this; a record request cannot set it.
   */
  assignedMemberId: string | null;
  assignedLabel: string | null;
  assignedAt: string | null;
  /** Set once the saved next step became a real commitment. */
  nextStepCommitmentId: string | null;
  opportunityId: string | null;
  quoteId: string | null;
  orderId: string | null;
  customerQuestion: string | null;
  commitmentCandidate: string | null;
  possibleRequestedDate: string | null;
  nextAction: string | null;
  /** Requested with this record. Persisted as a commitment by the command, not by this type. */
  nextStep: ConversationNextStep | null;
  source: typeof CUSTOMER_CONVERSATION_SOURCE;
  provenance: typeof CUSTOMER_CONVERSATION_PROVENANCE;
  providerConnected: false;
  modelCalled: false;
  providerCalled: false;
  paymentConfirmed: false;
  stockConfirmed: false;
  delivered: false;
  productionComplete: false;
  discountApproved: false;
  approved: false;
  commitmentCreated: false;
  questionResolved: false;
  linkedRecordMutated: false;
  canonicalMutation: 'refused';
  advisorNumberStatus: typeof WHATSAPP_NUMBER_PENDING;
  /** Always null. The corporate number was not provided and must not be invented. */
  advisorPhone: null;
};

export type CustomerConversationAdmission =
  | { ok: true; record: ManualCustomerConversation }
  | { ok: false; reason: CustomerConversationRefusal };

export type CustomerConversationPort = {
  readonly connected: false;
  readonly vendor: null;
  readonly modelCalled: false;
  record(input: RecordCustomerConversationInput): CustomerConversationAdmission;
  send(): { sent: false; reason: 'channel_not_connected'; providerCalled: false };
};

export type CustomerConversationRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  customer_label: string;
  contact_label: string | null;
  channel: CustomerConversationChannel;
  occurred_at: string;
  entered_by_member_id: string | null;
  entered_by_label: string;
  summary: string;
  pasted_evidence: string | null;
  reason: string | null;
  assigned_member_id: string | null;
  assigned_label: string | null;
  assigned_at: string | null;
  next_step_commitment_id: string | null;
  opportunity_id: string | null;
  quote_id: string | null;
  order_id: string | null;
  customer_question: string | null;
  commitment_candidate: string | null;
  possible_requested_date: string | null;
  next_action: string | null;
  source: typeof CUSTOMER_CONVERSATION_SOURCE;
  provenance: typeof CUSTOMER_CONVERSATION_PROVENANCE;
  advisor_number_status: typeof WHATSAPP_NUMBER_PENDING;
  created_at: string;
};

function blank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function refusalReason(error: z.ZodError): CustomerConversationRefusal {
  const fields = new Set(error.issues.map((issue) => String(issue.path[0] ?? '')));
  if (fields.has('organizationId')) return 'missing_tenant';
  if (fields.has('customerId') || fields.has('customerLabel')) return 'missing_customer';
  if (fields.has('summary')) return 'missing_summary';
  if (fields.has('reason')) return 'missing_reason';
  if (fields.has('nextStep')) return 'invalid_next_step';
  if (fields.has('enteredByLabel')) return 'missing_entered_by';
  if (fields.has('occurredAt')) return 'invalid_occurred_at';
  if (fields.has('possibleRequestedDate')) return 'invalid_requested_date';
  return 'invalid_record';
}

function seal(parsed: z.output<typeof RecordCustomerConversationSchema>): ManualCustomerConversation {
  return {
    id: parsed.id,
    organizationId: parsed.organizationId,
    customerId: parsed.customerId,
    customerLabel: parsed.customerLabel,
    contactLabel: parsed.contactLabel,
    channel: parsed.channel,
    occurredAt: parsed.occurredAt,
    enteredByMemberId: parsed.enteredByMemberId,
    enteredByLabel: parsed.enteredByLabel,
    summary: parsed.summary,
    pastedEvidence: parsed.pastedEvidence,
    reason: parsed.reason,
    // A record request never assigns, links a commitment, or claims one exists.
    assignedMemberId: null,
    assignedLabel: null,
    assignedAt: null,
    nextStepCommitmentId: null,
    opportunityId: parsed.opportunityId,
    quoteId: parsed.quoteId,
    orderId: parsed.orderId,
    customerQuestion: parsed.customerQuestion,
    commitmentCandidate: parsed.commitmentCandidate,
    possibleRequestedDate: parsed.possibleRequestedDate,
    nextAction: parsed.nextAction ?? parsed.nextStep?.description ?? null,
    nextStep: parsed.nextStep,
    source: CUSTOMER_CONVERSATION_SOURCE,
    provenance: CUSTOMER_CONVERSATION_PROVENANCE,
    providerConnected: false,
    modelCalled: false,
    providerCalled: false,
    paymentConfirmed: false,
    stockConfirmed: false,
    delivered: false,
    productionComplete: false,
    discountApproved: false,
    approved: false,
    commitmentCreated: false,
    questionResolved: false,
    linkedRecordMutated: false,
    canonicalMutation: 'refused',
    advisorNumberStatus: WHATSAPP_NUMBER_PENDING,
    advisorPhone: null,
  };
}

/**
 * Admits a company-entered record. Ignores any attempt to confirm, send, or approve.
 * A WhatsApp channel is a label the company chose. The provider stays disconnected.
 */
export function recordManualCustomerConversation(
  input: RecordCustomerConversationInput,
): CustomerConversationAdmission {
  if (blank(input.organizationId)) return { ok: false, reason: 'missing_tenant' };
  if (blank(input.customerId) || blank(input.customerLabel)) {
    return { ok: false, reason: 'missing_customer' };
  }

  const parsed = RecordCustomerConversationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: refusalReason(parsed.error) };
  return { ok: true, record: seal(parsed.data) };
}

/** A message is evidence. The words cannot confirm a payment. */
export function conversationEvidenceConfirmsPayment(_text?: unknown): false {
  return false;
}

/** A requested date and the word "entregado" do not deliver. */
export function conversationEvidenceMayDeliver(_record?: unknown): false {
  return false;
}

/** Evidence cannot approve a discount or any other decision. */
export function conversationEvidenceMayApprove(_record?: unknown): false {
  return false;
}

export function conversationEvidenceMayConfirmStock(_record?: unknown): false {
  return false;
}

export function conversationEvidenceMayCompleteProduction(_record?: unknown): false {
  return false;
}

/** Choosing WhatsApp does not connect the channel and does not call a model. */
export function conversationChannelIsConnected(_channel?: CustomerConversationChannel): false {
  return false;
}

/**
 * The sales advisor's corporate WhatsApp number was not provided.
 * A passed value is ignored. This never returns digits.
 */
export function advisorCorporateNumber(_claimedPhone?: unknown): {
  status: typeof WHATSAPP_NUMBER_PENDING;
  phone: null;
  providerConnected: false;
} {
  return { status: WHATSAPP_NUMBER_PENDING, phone: null, providerConnected: false };
}

export function whatsAppNumberWasProvided(): false {
  return false;
}

export function customerConversationPortMaySend(): false {
  return false;
}

/** Port for a company-entered record. It cannot send, and it does not call a provider. */
export function createManualCustomerConversationPort(): CustomerConversationPort {
  return {
    connected: false,
    vendor: null,
    modelCalled: false,
    record: recordManualCustomerConversation,
    send() {
      return { sent: false, reason: 'channel_not_connected', providerCalled: false };
    },
  };
}

function assertRowShape(row: CustomerConversationRow): void {
  const keys = Object.keys(row);
  for (const forbidden of FORBIDDEN_ROW_KEYS) {
    if (keys.includes(forbidden)) {
      throw new Error('A conversation record cannot store confirmation fields');
    }
  }
  if (!row.organization_id.trim() || !row.customer_id.trim()) {
    throw new Error('A conversation record requires a tenant and a customer');
  }
  if (row.source !== CUSTOMER_CONVERSATION_SOURCE || row.provenance !== CUSTOMER_CONVERSATION_PROVENANCE) {
    throw new Error('A conversation record stays company-entered');
  }
  if (row.advisor_number_status !== WHATSAPP_NUMBER_PENDING) {
    throw new Error('The corporate WhatsApp number stays pending');
  }
}

/** Builds an insert row. Confirmation and provider ids are not columns. */
export function buildCustomerConversationRow(
  record: ManualCustomerConversation,
  createdAt: string,
): CustomerConversationRow {
  if (Number.isNaN(new Date(createdAt).getTime())) {
    throw new Error('createdAt must be a valid timestamp');
  }
  if (record.providerConnected || record.paymentConfirmed || record.delivered || record.discountApproved) {
    throw new Error('A conversation record cannot confirm or connect a provider');
  }

  const row: CustomerConversationRow = {
    id: record.id,
    organization_id: record.organizationId,
    customer_id: record.customerId,
    customer_label: record.customerLabel,
    contact_label: record.contactLabel,
    channel: record.channel,
    occurred_at: record.occurredAt,
    entered_by_member_id: record.enteredByMemberId,
    entered_by_label: record.enteredByLabel,
    summary: record.summary,
    pasted_evidence: record.pastedEvidence,
    reason: record.reason,
    assigned_member_id: record.assignedMemberId,
    assigned_label: record.assignedLabel,
    assigned_at: record.assignedAt,
    next_step_commitment_id: record.nextStepCommitmentId,
    opportunity_id: record.opportunityId,
    quote_id: record.quoteId,
    order_id: record.orderId,
    customer_question: record.customerQuestion,
    commitment_candidate: record.commitmentCandidate,
    possible_requested_date: record.possibleRequestedDate,
    next_action: record.nextAction,
    source: CUSTOMER_CONVERSATION_SOURCE,
    provenance: CUSTOMER_CONVERSATION_PROVENANCE,
    advisor_number_status: WHATSAPP_NUMBER_PENDING,
    created_at: createdAt,
  };
  assertRowShape(row);
  return row;
}
