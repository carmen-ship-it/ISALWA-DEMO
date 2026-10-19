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
  'ChangeContactPhone',
  'RetireContactPhone',
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
  phone: z.string().max(32).optional(),
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
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
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

export const ChangeContactPhonePayloadSchema = z.object({
  ...contactPhoneTarget,
  newPhone: z.string().trim().min(1).max(32),
  verificationMethod: z.enum(CONTACT_PHONE_VERIFICATION_METHODS),
  /** No personal documents by default (A2 §58). */
  evidenceNote: z.string().trim().min(1).max(500).optional(),
});

/** A2 §66: a retired number leaves follow-ups and default selection; the person and contact stay. */
export const RetireContactPhonePayloadSchema = z.object(contactPhoneTarget);

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
  ChangeContactPhone: ChangeContactPhonePayloadSchema,
  RetireContactPhone: RetireContactPhonePayloadSchema,
  UpdateFiscalIdentity: UpdateFiscalIdentityPayloadSchema,
  CreateLead: CreateLeadPayloadSchema,
  ResolveLead: ResolveLeadPayloadSchema,
  RequestPartyMerge: RequestPartyMergePayloadSchema,
  ApprovePartyMerge: ApprovePartyMergePayloadSchema,
  RejectPartyMerge: RejectPartyMergePayloadSchema,
};
