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
});

export const UpdatePartyPayloadSchema = z.object({
  partyId: z.string().min(1),
  displayName: z.string().min(1).optional(),
  legalName: z.string().nullable().optional(),
  expectedVersion: z.number().int().nonnegative(),
});

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
  UpdateFiscalIdentity: UpdateFiscalIdentityPayloadSchema,
  CreateLead: CreateLeadPayloadSchema,
  ResolveLead: ResolveLeadPayloadSchema,
  RequestPartyMerge: RequestPartyMergePayloadSchema,
  ApprovePartyMerge: ApprovePartyMergePayloadSchema,
  RejectPartyMerge: RejectPartyMergePayloadSchema,
};
