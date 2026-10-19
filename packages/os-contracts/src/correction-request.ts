/**
 * T03 contract L4 — customer data correction requests.
 *
 * A correction request is an issue (ReportIssue) with one restricted correction record.
 * It never writes customer data itself: the responsible person applies the change through
 * the normal customer command, then resolves the request citing that business event.
 * Payments, quotes, orders and issued documents are outside its fields by construction.
 */
import { z } from 'zod';

export const CORRECTION_FIELDS = [
  'display_name',
  'legal_name',
  'fiscal_identity',
  'contact_name',
  'contact_email',
  'contact_phone',
  'contact_whatsapp',
  'location_address',
  'location_city',
  'other',
] as const;
export type CorrectionField = (typeof CORRECTION_FIELDS)[number];

export const CORRECTION_SOURCES = ['customer', 'staff', 'document'] as const;
export type CorrectionSource = (typeof CORRECTION_SOURCES)[number];

export const CORRECTION_DECISIONS = ['applied', 'rejected'] as const;
export type CorrectionDecision = (typeof CORRECTION_DECISIONS)[number];

const CONTACT_FIELDS: readonly CorrectionField[] = [
  'contact_name',
  'contact_email',
  'contact_phone',
  'contact_whatsapp',
];
const LOCATION_FIELDS: readonly CorrectionField[] = ['location_address', 'location_city'];

/** Which business events can show that a requested change was applied. */
export const CORRECTION_APPLIED_EVENT_TYPES: Record<CorrectionField, readonly string[]> = {
  display_name: ['party.updated'],
  legal_name: ['party.updated'],
  fiscal_identity: ['party.fiscal_identity.changed'],
  contact_name: ['contact.updated'],
  contact_email: ['contact.updated'],
  contact_phone: ['contact.endpoint.changed', 'contact.endpoint.retired'],
  contact_whatsapp: ['contact.endpoint.changed', 'contact.endpoint.retired'],
  location_address: ['location.updated'],
  location_city: ['location.updated'],
  other: [
    'party.updated',
    'party.fiscal_identity.changed',
    'contact.updated',
    'contact.endpoint.changed',
    'contact.endpoint.retired',
    'location.updated',
  ],
};

/**
 * Who may apply (and therefore own and decide) a correction for this field, beyond knowing
 * the customer: `fiscal` → fiscal.admin (UpdateFiscalIdentity); `steward` → master_data.admin
 * (legal name is data-steward maintenance); `customer_edit` → master_data.admin or customer edit.
 */
export function correctionApplyRule(field: CorrectionField): 'fiscal' | 'steward' | 'customer_edit' {
  if (field === 'fiscal_identity') return 'fiscal';
  if (field === 'legal_name') return 'steward';
  return 'customer_edit';
}

export const CorrectionRequestInputSchema = z
  .object({
    partyId: z.string().min(1),
    contactId: z.string().min(1).optional(),
    locationId: z.string().min(1).optional(),
    field: z.enum(CORRECTION_FIELDS),
    proposedValue: z.string().trim().min(1).max(500),
    source: z.enum(CORRECTION_SOURCES),
  })
  .superRefine((value, issue) => {
    if (CONTACT_FIELDS.includes(value.field) && !value.contactId) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['contactId'], message: 'contactId required' });
    }
    if (LOCATION_FIELDS.includes(value.field) && !value.locationId) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['locationId'], message: 'locationId required' });
    }
  });
export type CorrectionRequestInput = z.infer<typeof CorrectionRequestInputSchema>;

export const CorrectionDecisionInputSchema = z
  .object({
    decision: z.enum(CORRECTION_DECISIONS),
    appliedEventId: z.string().min(1).optional(),
    reason: z.string().trim().min(10).max(500),
  })
  .superRefine((value, issue) => {
    if (value.decision === 'applied' && !value.appliedEventId) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['appliedEventId'], message: 'appliedEventId required' });
    }
    if (value.decision === 'rejected' && value.appliedEventId) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['appliedEventId'], message: 'not allowed on rejection' });
    }
  });
export type CorrectionDecisionInput = z.infer<typeof CorrectionDecisionInputSchema>;

export type CorrectionAppliedEvent = {
  eventType: string;
  occurredAt: Date;
  primaryEntityType: string;
  primaryEntityId: string;
  payload: Record<string, unknown> | null;
};

export type CorrectionTarget = {
  partyId: string;
  contactId: string | null;
  locationId: string | null;
  field: CorrectionField;
  reportedAt: Date;
};

/**
 * Whether `event` is a change of the requested kind, on the requested customer (and contact or
 * location when the request names one), recorded at or after the request.
 */
export function correctionEventMatches(target: CorrectionTarget, event: CorrectionAppliedEvent): boolean {
  if (!CORRECTION_APPLIED_EVENT_TYPES[target.field].includes(event.eventType)) return false;
  if (event.occurredAt.getTime() < target.reportedAt.getTime()) return false;
  const payload = event.payload ?? {};
  const payloadParty = (key: string) => typeof payload[key] === 'string' && payload[key] === target.partyId;
  if (event.eventType === 'party.updated') {
    return event.primaryEntityType === 'party' && event.primaryEntityId === target.partyId;
  }
  if (event.eventType === 'party.fiscal_identity.changed') return payloadParty('partyId');
  if (event.eventType === 'contact.updated') {
    if (event.primaryEntityType !== 'contact' || !payloadParty('organizationPartyId')) return false;
    return !target.contactId || event.primaryEntityId === target.contactId;
  }
  if (event.eventType === 'contact.endpoint.changed' || event.eventType === 'contact.endpoint.retired') {
    if (event.primaryEntityType !== 'contact' || !payloadParty('partyId')) return false;
    return !target.contactId || event.primaryEntityId === target.contactId;
  }
  if (event.eventType === 'location.updated') {
    if (event.primaryEntityType !== 'location' || !payloadParty('partyId')) return false;
    return !target.locationId || event.primaryEntityId === target.locationId;
  }
  return false;
}

/** Read model for GET /v1/issues/:issueId/correction. `proposedValue` is null for viewers without access. */
export type CorrectionRequestView = {
  issueId: string;
  partyId: string;
  contactId: string | null;
  locationId: string | null;
  field: CorrectionField;
  source: CorrectionSource;
  proposedValue: string | null;
  state: 'pending' | 'in_review' | 'applied' | 'rejected';
  decision: CorrectionDecision | null;
  appliedEventId: string | null;
  decisionReason: string | null;
  decidedByMemberId: string | null;
  decidedAt: string | null;
  canDecide: boolean;
};
