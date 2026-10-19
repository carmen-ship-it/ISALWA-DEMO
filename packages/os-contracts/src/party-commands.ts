import { z } from 'zod';
import { PARTY_KINDS, PARTY_ROLE_KEYS } from './party-roles';

export const PARTY_COMMAND_NAMES = [
  'CreateParty',
  'UpdateParty',
  'DeactivateParty',
  'ReactivateParty',
  'AssignPartyRole',
  'EndPartyRole',
  'UpdateContact',
  'ChangeContactEndpoint',
  'RetireContactEndpoint',
  'RevealContactEndpoint',
  'ResolveContactIdentityReview',
  'UpdateFiscalIdentity',
  'CreateLead',
  'ResolveLead',
  'RequestPartyMerge',
  'ApprovePartyMerge',
  'RejectPartyMerge',
] as const;

export type PartyCommandName = (typeof PARTY_COMMAND_NAMES)[number];

const FiscalIdentityInputSchema = z.object({
  nit: z.string().min(1),
  razonSocial: z.string().min(1),
});

/**
 * T03 C5: one number contract for contact creation, registration and endpoint changes.
 * The country is always explicit; it is never inferred from the digit count.
 */
export const CONTACT_PHONE_COUNTRIES = ['BO'] as const;
export type ContactPhoneCountry = (typeof CONTACT_PHONE_COUNTRIES)[number];
export const CONTACT_ENDPOINT_CHANNELS = ['phone', 'whatsapp'] as const;
export type ContactEndpointChannel = (typeof CONTACT_ENDPOINT_CHANNELS)[number];
export const CONTACT_ENDPOINT_STATUSES = ['unverified', 'verified', 'identity_review'] as const;
export type ContactEndpointStatus = (typeof CONTACT_ENDPOINT_STATUSES)[number];

export const ContactNumberInputSchema = z.object({
  country: z.enum(CONTACT_PHONE_COUNTRIES),
  number: z.string().trim().min(1).max(40),
});
export type ContactNumberInput = z.infer<typeof ContactNumberInputSchema>;

const COUNTRY_RULES: Record<ContactPhoneCountry, { callingCode: string; national: RegExp }> = {
  // Bolivia: 8-digit national numbers; landlines start with the area digit 2–4, mobiles with 6–7.
  BO: { callingCode: '591', national: /^[2-46-7]\d{7}$/ },
};

/**
 * E.164 for a number entered with an explicit country, or null when it is not a valid number
 * of that country. Accepts separators and the country's own international prefix (+591 / 00591).
 * A different calling code, or digits that only fit after guessing a country, is refused.
 */
export function normalizeContactNumber(input: { country: string; number: string }): string | null {
  const rule = COUNTRY_RULES[input.country as ContactPhoneCountry];
  if (!rule) return null;
  const text = input.number.trim();
  if (!/^[+\d\s().-]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, '');
  let national: string;
  if (text.startsWith('+')) {
    if (!digits.startsWith(rule.callingCode)) return null;
    national = digits.slice(rule.callingCode.length);
  } else if (digits.startsWith(`00${rule.callingCode}`)) {
    national = digits.slice(2 + rule.callingCode.length);
  } else {
    national = digits;
  }
  return rule.national.test(national) ? `+${rule.callingCode}${national}` : null;
}

/** Last three digits only. Used wherever a number is shown outside the restricted history. */
export function maskContactNumber(number: string | null | undefined): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, '');
  return digits.length >= 3 ? `•••${digits.slice(-3)}` : '•••';
}

export const CreatePartyPayloadSchema = z.object({
  partyKind: z.enum(PARTY_KINDS),
  displayName: z.string().min(1),
  legalName: z.string().optional(),
  fiscalIdentity: FiscalIdentityInputSchema.optional(),
  initialRoleKey: z.enum(PARTY_ROLE_KEYS).optional(),
  createCommercialAccount: z.boolean().optional(),
  /** V2 §5.4 Registrar cliente. Omitted = creator when they hold commercial.customer.create. */
  accountOwnerMemberId: z.string().min(1).optional(),
  contact: z
    .object({ givenName: z.string().trim().min(1).max(200), familyName: z.string().max(200).optional() })
    .optional(),
  phone: ContactNumberInputSchema.optional(),
  noPhoneReason: z.literal('no_phone_available').optional(),
  city: z.string().max(120).optional(),
  department: z.string().max(120).optional(),
  addressReference: z.string().max(500).optional(),
  /** Required when the phone already appears on other records ("Registrar otro cliente"). */
  duplicateReason: z.string().trim().min(1).max(500).optional(),
});

/**
 * Change kinds recorded on `party.updated` events before 2026-10-18. Only read to label
 * history; UpdateParty no longer accepts a kind.
 */
export const PARTY_CHANGE_KINDS = ['typo', 'correction', 'update'] as const;
export type PartyChangeKind = (typeof PARTY_CHANGE_KINDS)[number];

export const UpdatePartyPayloadSchema = z.object({
  partyId: z.string().min(1),
  displayName: z.string().min(1).optional(),
  legalName: z.string().nullable().optional(),
  expectedVersion: z.number().int().nonnegative(),
  changeReason: z.string().trim().min(1).max(500).optional(),
});

/** Owner decision 2026-10-18: any actual name or legal-name change needs a reason, typos included. */
export function partyChangeNeedsReason(input: { changedFields: readonly string[]; changeKind?: unknown }): boolean {
  return input.changedFields.length > 0;
}

export const DeactivatePartyPayloadSchema = z.object({
  partyId: z.string().min(1),
});

export const ReactivatePartyPayloadSchema = z.object({
  partyId: z.string().min(1),
});

export const AssignPartyRolePayloadSchema = z.object({
  partyId: z.string().min(1),
  roleKey: z.enum(PARTY_ROLE_KEYS),
  effectiveAt: z.string().datetime().optional(),
  createCommercialAccount: z.boolean().optional(),
});

export const EndPartyRolePayloadSchema = z.object({
  roleAssignmentId: z.string().min(1),
  endedAt: z.string().datetime().optional(),
});

export const UpdateContactPayloadSchema = z.object({
  organizationPartyId: z.string().min(1),
  contactId: z.string().optional(),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  email: z.string().email().optional(),
  /** Only when creating a contact. An existing contact's numbers change through ChangeContactEndpoint. */
  phone: ContactNumberInputSchema.optional(),
  whatsapp: ContactNumberInputSchema.optional(),
  title: z.string().optional(),
  personPartyId: z.string().optional(),
});

/** A2 §58. A new sender saying "soy X" is never a verification method. */
export const CONTACT_PHONE_CHANGE_REASONS = ['number_changed', 'entry_error', 'no_longer_belongs', 'other'] as const;
export const CONTACT_PHONE_VERIFICATION_METHODS = [
  'known_contact_confirmation',
  'in_person',
  'previously_verified_channel',
  'owner_review',
] as const;
export type ContactPhoneChangeReason = (typeof CONTACT_PHONE_CHANGE_REASONS)[number];

const contactPhoneTarget = {
  partyId: z.string().min(1),
  contactId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
  reason: z.enum(CONTACT_PHONE_CHANGE_REASONS),
  /** Required when reason is `other`. */
  reasonNote: z.string().trim().min(1).max(500).optional(),
};

/** Phone and WhatsApp are one boundary: the same authority, reason, verification and version rules. */
export const ChangeContactEndpointPayloadSchema = z.object({
  ...contactPhoneTarget,
  channel: z.enum(CONTACT_ENDPOINT_CHANNELS),
  newNumber: ContactNumberInputSchema,
  verificationMethod: z.enum(CONTACT_PHONE_VERIFICATION_METHODS),
  /** No personal documents by default (A2 §58). */
  evidenceNote: z.string().trim().min(1).max(500).optional(),
});

/** A2 §66: a retired number is no current destination anywhere; the person, contact and history stay. */
export const RetireContactEndpointPayloadSchema = z.object({
  ...contactPhoneTarget,
  channel: z.enum(CONTACT_ENDPOINT_CHANNELS),
});

/** T03 C6: one full number from the contact's history, for a stated reason. Audited without the number. */
export const RevealContactEndpointPayloadSchema = z.object({
  partyId: z.string().min(1),
  contactId: z.string().min(1),
  associationId: z.string().min(1),
  justification: z.string().trim().min(10).max(500),
});

export const CONTACT_IDENTITY_REVIEW_DECISIONS = ['confirmed', 'rejected'] as const;

/**
 * T03 C7: decide an open identity review on one channel. `confirmed` puts the number in use as
 * unverified; `rejected` retires it. Nothing about the number's earlier customer is involved.
 */
export const ResolveContactIdentityReviewPayloadSchema = z.object({
  partyId: z.string().min(1),
  contactId: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
  channel: z.enum(CONTACT_ENDPOINT_CHANNELS),
  decision: z.enum(CONTACT_IDENTITY_REVIEW_DECISIONS),
  verificationMethod: z.enum(CONTACT_PHONE_VERIFICATION_METHODS),
  note: z.string().trim().min(1).max(500).optional(),
});

/** T03 C6: one row of a contact's restricted number history. Never carries the full number. */
export type ContactEndpointHistoryItem = {
  associationId: string;
  channel: ContactEndpointChannel;
  numberMasked: string | null;
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
  verificationMethod: string | null;
};

export const UpdateFiscalIdentityPayloadSchema = z.object({
  partyId: z.string().min(1),
  nit: z.string().min(1),
  razonSocial: z.string().min(1),
  effectiveAt: z.string().datetime().optional(),
});

export const CreateLeadPayloadSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  batchRef: z.string().optional(),
});

export const ResolveLeadPayloadSchema = z.object({
  leadId: z.string().min(1),
  partyKind: z.enum(PARTY_KINDS),
  displayName: z.string().min(1).optional(),
  legalName: z.string().optional(),
  initialRoleKey: z.enum(PARTY_ROLE_KEYS).optional(),
});

export const RequestPartyMergePayloadSchema = z.object({
  sourcePartyId: z.string().min(1),
  targetPartyId: z.string().min(1),
});

export const ApprovePartyMergePayloadSchema = z.object({
  mergeRequestId: z.string().min(1),
});

export const RejectPartyMergePayloadSchema = z.object({
  mergeRequestId: z.string().min(1),
});

export const PARTY_COMMAND_PAYLOAD_SCHEMAS: Record<PartyCommandName, z.ZodTypeAny> = {
  CreateParty: CreatePartyPayloadSchema,
  UpdateParty: UpdatePartyPayloadSchema,
  DeactivateParty: DeactivatePartyPayloadSchema,
  ReactivateParty: ReactivatePartyPayloadSchema,
  AssignPartyRole: AssignPartyRolePayloadSchema,
  EndPartyRole: EndPartyRolePayloadSchema,
  UpdateContact: UpdateContactPayloadSchema,
  ChangeContactEndpoint: ChangeContactEndpointPayloadSchema,
  RetireContactEndpoint: RetireContactEndpointPayloadSchema,
  RevealContactEndpoint: RevealContactEndpointPayloadSchema,
  ResolveContactIdentityReview: ResolveContactIdentityReviewPayloadSchema,
  UpdateFiscalIdentity: UpdateFiscalIdentityPayloadSchema,
  CreateLead: CreateLeadPayloadSchema,
  ResolveLead: ResolveLeadPayloadSchema,
  RequestPartyMerge: RequestPartyMergePayloadSchema,
  ApprovePartyMerge: ApprovePartyMergePayloadSchema,
  RejectPartyMerge: RejectPartyMergePayloadSchema,
};
