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
    /** Required when the value the cited change set differs from the proposal (or cannot be compared). */
    differenceExplanation: z.string().trim().min(10).max(500).optional(),
  })
  .superRefine((value, issue) => {
    if (value.decision === 'applied' && !value.appliedEventId) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['appliedEventId'], message: 'appliedEventId required' });
    }
    if (value.decision === 'rejected' && (value.appliedEventId || value.differenceExplanation)) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['appliedEventId'], message: 'not allowed on rejection' });
    }
  });
export type CorrectionDecisionInput = z.infer<typeof CorrectionDecisionInputSchema>;

export type CorrectionAppliedEvent = {
  id?: string;
  actorMemberId?: string | null;
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

const commaFields = (payload: Record<string, unknown>): string[] =>
  typeof payload.changedFields === 'string' ? payload.changedFields.split(',').filter(Boolean) : [];

/**
 * The correction fields a customer change event actually changed, from its field metadata.
 * Events without field metadata change nothing citable: display name and legal name are never
 * interchangeable, and a contact creation is not a correction of an existing contact.
 */
export function correctionFieldsChangedBy(event: CorrectionAppliedEvent): CorrectionField[] {
  const payload = event.payload ?? {};
  const fields = commaFields(payload);
  switch (event.eventType) {
    case 'party.updated':
      return [
        ...(fields.includes('displayName') ? (['display_name'] as const) : []),
        ...(fields.includes('legalName') ? (['legal_name'] as const) : []),
      ];
    case 'party.fiscal_identity.changed':
      return ['fiscal_identity'];
    case 'contact.updated':
      if (payload.created === true) return [];
      return [
        ...(fields.includes('givenName') || fields.includes('familyName') ? (['contact_name'] as const) : []),
        ...(fields.includes('email') ? (['contact_email'] as const) : []),
      ];
    case 'contact.endpoint.changed':
    case 'contact.endpoint.retired': {
      const out: CorrectionField[] = [];
      if (payload.channel === 'phone') out.push('contact_phone');
      if (payload.channel === 'whatsapp' || payload.whatsappFollows === true) out.push('contact_whatsapp');
      return out;
    }
    case 'location.updated':
      return fields.includes('addressText') ? ['location_address'] : [];
    default:
      return [];
  }
}

function eventOnTarget(target: CorrectionTarget, event: CorrectionAppliedEvent): boolean {
  const payload = event.payload ?? {};
  const payloadParty = (key: string) => typeof payload[key] === 'string' && payload[key] === target.partyId;
  switch (event.eventType) {
    case 'party.updated':
      return event.primaryEntityType === 'party' && event.primaryEntityId === target.partyId;
    case 'party.fiscal_identity.changed':
      return payloadParty('partyId');
    case 'contact.updated':
      return (
        event.primaryEntityType === 'contact' &&
        payloadParty('organizationPartyId') &&
        (!target.contactId || event.primaryEntityId === target.contactId)
      );
    case 'contact.endpoint.changed':
    case 'contact.endpoint.retired':
      return (
        event.primaryEntityType === 'contact' &&
        payloadParty('partyId') &&
        (!target.contactId || event.primaryEntityId === target.contactId)
      );
    case 'location.updated':
      return (
        event.primaryEntityType === 'location' &&
        payloadParty('partyId') &&
        (!target.locationId || event.primaryEntityId === target.locationId)
      );
    default:
      return false;
  }
}

/**
 * Whether `event` changed the requested field on the requested customer (and contact or location
 * when the request names one), recorded at or after the request. `other` accepts any citable change.
 */
export function correctionEventMatches(target: CorrectionTarget, event: CorrectionAppliedEvent): boolean {
  if (!CORRECTION_APPLIED_EVENT_TYPES[target.field].includes(event.eventType)) return false;
  if (event.occurredAt.getTime() < target.reportedAt.getTime()) return false;
  if (!eventOnTarget(target, event)) return false;
  const changed = correctionFieldsChangedBy(event);
  return target.field === 'other' ? changed.length > 0 : changed.includes(target.field);
}

/** The target version the change produced, when the event records one. */
export function correctionEventVersion(event: CorrectionAppliedEvent): number | null {
  const v = event.payload?.version;
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

/**
 * The value the cited change set for the field, read from the event. `undefined` when the event
 * does not carry it (endpoint events carry masked numbers only).
 */
export function correctionAppliedValue(field: CorrectionField, event: CorrectionAppliedEvent): string | null | undefined {
  const p = event.payload ?? {};
  const str = (v: unknown) => (typeof v === 'string' ? v : v === null ? null : undefined);
  switch (field) {
    case 'display_name':
      return str(p.displayName);
    case 'legal_name':
      return str(p.legalName);
    case 'fiscal_identity':
      return str(p.nit);
    case 'contact_name':
      return typeof p.givenName === 'string' && typeof p.familyName === 'string'
        ? `${p.givenName} ${p.familyName}`
        : undefined;
    case 'contact_email':
      return str(p.email);
    case 'location_address':
      return str(p.addressText);
    default:
      return undefined;
  }
}

const normalizeText = (v: string) => v.normalize('NFKC').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim();
const digits = (v: string) => v.replace(/\D+/g, '');

/**
 * Whether the value the change set is the proposed value: case- and spacing-insensitive text
 * (accents count); phone numbers by digits (a national number matches its E.164 form);
 * fiscal identity by NIT digits. `other` is never comparable.
 */
export function correctionValueMatches(field: CorrectionField, proposed: string, actual: string | null): boolean {
  if (actual === null || field === 'other') return false;
  if (field === 'contact_phone' || field === 'contact_whatsapp') {
    const want = digits(proposed);
    const have = digits(actual);
    return want.length >= 7 && (have === want || have.endsWith(want));
  }
  if (field === 'fiscal_identity') {
    const want = digits(proposed);
    return want.length > 0 && want === digits(actual);
  }
  return normalizeText(proposed) === normalizeText(actual);
}

/**
 * Database prefilter for candidate changes (the same rule as correctionEventMatches, which is
 * applied again to every row). `payloadParty` names the payload key holding the party id, or
 * 'primary' when the event's primary entity is the party. `fieldKeys` are comma-format field
 * names, any of which must appear; `channels` restrict endpoint events.
 */
export type CorrectionChangeCriterion = {
  eventTypes: readonly string[];
  primaryEntityType: string;
  primaryEntityId: string | null;
  payloadParty: 'primary' | 'partyId' | 'organizationPartyId';
  fieldKeys: readonly string[] | null;
  channels: readonly ('phone' | 'whatsapp')[] | null;
  whatsappFollows: boolean;
};

export function correctionChangeCriteria(target: CorrectionTarget): CorrectionChangeCriterion[] {
  const party = (fieldKeys: string[] | null): CorrectionChangeCriterion => ({
    eventTypes: ['party.updated'],
    primaryEntityType: 'party',
    primaryEntityId: target.partyId,
    payloadParty: 'primary',
    fieldKeys,
    channels: null,
    whatsappFollows: false,
  });
  const fiscal: CorrectionChangeCriterion = {
    eventTypes: ['party.fiscal_identity.changed'],
    primaryEntityType: 'fiscal_identity',
    primaryEntityId: null,
    payloadParty: 'partyId',
    fieldKeys: null,
    channels: null,
    whatsappFollows: false,
  };
  const contact = (fieldKeys: string[]): CorrectionChangeCriterion => ({
    eventTypes: ['contact.updated'],
    primaryEntityType: 'contact',
    primaryEntityId: target.contactId,
    payloadParty: 'organizationPartyId',
    fieldKeys,
    channels: null,
    whatsappFollows: false,
  });
  const endpoint = (channels: ('phone' | 'whatsapp')[], whatsappFollows = false): CorrectionChangeCriterion => ({
    eventTypes: ['contact.endpoint.changed', 'contact.endpoint.retired'],
    primaryEntityType: 'contact',
    primaryEntityId: target.contactId,
    payloadParty: 'partyId',
    fieldKeys: null,
    channels,
    whatsappFollows,
  });
  const location: CorrectionChangeCriterion = {
    eventTypes: ['location.updated'],
    primaryEntityType: 'location',
    primaryEntityId: target.locationId,
    payloadParty: 'partyId',
    fieldKeys: ['addressText'],
    channels: null,
    whatsappFollows: false,
  };
  switch (target.field) {
    case 'display_name':
      return [party(['displayName'])];
    case 'legal_name':
      return [party(['legalName'])];
    case 'fiscal_identity':
      return [fiscal];
    case 'contact_name':
      return [contact(['givenName', 'familyName'])];
    case 'contact_email':
      return [contact(['email'])];
    case 'contact_phone':
      return [endpoint(['phone'])];
    case 'contact_whatsapp':
      return [endpoint(['whatsapp']), endpoint(['phone'], true)];
    case 'location_address':
      return [location];
    case 'location_city':
      return [];
    case 'other':
      return [
        party(['displayName', 'legalName']),
        fiscal,
        contact(['givenName', 'familyName', 'email']),
        endpoint(['phone', 'whatsapp']),
        location,
      ];
  }
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

/**
 * Read model for GET /v1/issues/:issueId/correction/candidate-events: events an applied decision
 * may cite, newest first. Metadata only; event payloads (names, masked numbers) are not returned.
 */
export type CorrectionCandidateEvent = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  actorMemberId: string | null;
  /** Correction fields this change touched (names only, never values). */
  fields: CorrectionField[];
};

/** One page of candidate changes; `nextCursor` is opaque and null on the last page. */
export type CorrectionCandidatePage = {
  events: CorrectionCandidateEvent[];
  nextCursor: string | null;
};
