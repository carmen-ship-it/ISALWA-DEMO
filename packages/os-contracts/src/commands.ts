import { z } from 'zod';
import { ADDITIONAL_ASSIGNABLE_SCOPE_KEYS } from './scopes';

export const WORKFORCE_COMMAND_NAMES = [
  'InviteMember',
  'ActivateMember',
  'ChangeMemberEmail',
  'RequestMemberEmailChange',
  'ChangeDepartment',
  'ChangeRole',
  'GrantAdditionalRole',
  'EndAdditionalRole',
  'ChangeManager',
  'GrantDelegation',
  'RevokeDelegation',
  'SuspendMember',
  'TerminateMember',
  'RehireMember',
  'RetryAuthProviderSync',
] as const;

export type WorkforceCommandName = (typeof WORKFORCE_COMMAND_NAMES)[number];

export const InviteMemberPayloadSchema = z.object({
  email: z.string().email(),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  departmentId: z.string().optional(),
  roleKey: z.string().min(1),
  managerMemberId: z.string().optional(),
});

export const ActivateMemberPayloadSchema = z.object({
  memberId: z.string().min(1),
  providerSubject: z.string().min(1),
});

export const ChangeMemberEmailPayloadSchema = z.object({
  memberId: z.string().min(1),
  newEmail: z.string().email(),
});

export const RequestMemberEmailChangePayloadSchema = z.object({
  newEmail: z.string().email(),
});

export const ChangeDepartmentPayloadSchema = z.object({
  memberId: z.string().min(1),
  departmentId: z.string().min(1),
  effectiveAt: z.string().datetime().optional(),
});

export const ChangeRolePayloadSchema = z.object({
  memberId: z.string().min(1),
  roleKey: z.string().min(1),
  effectiveAt: z.string().datetime().optional(),
});

export const GrantAdditionalRolePayloadSchema = z.object({
  memberId: z.string().min(1),
  roleKey: z.enum(ADDITIONAL_ASSIGNABLE_SCOPE_KEYS),
});

export const EndAdditionalRolePayloadSchema = z.object({
  memberId: z.string().min(1),
  roleKey: z.enum(ADDITIONAL_ASSIGNABLE_SCOPE_KEYS),
});

export const ChangeManagerPayloadSchema = z.object({
  memberId: z.string().min(1),
  managerMemberId: z.string().min(1),
  effectiveAt: z.string().datetime().optional(),
});

export const GrantDelegationPayloadSchema = z.object({
  delegateMemberId: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1),
  expiresAt: z.string().datetime(),
  startsAt: z.string().datetime().optional(),
});

export const RevokeDelegationPayloadSchema = z.object({
  delegationId: z.string().min(1),
});

export const SuspendMemberPayloadSchema = z.object({
  memberId: z.string().min(1),
  reason: z.string().optional(),
});

export const TerminateMemberPayloadSchema = z.object({
  memberId: z.string().min(1),
  reason: z.string().optional(),
});

export const RehireMemberPayloadSchema = z.object({
  personId: z.string().min(1),
  email: z.string().email(),
  roleKey: z.string().min(1),
  departmentId: z.string().optional(),
});

export const RetryAuthProviderSyncPayloadSchema = z.object({
  memberId: z.string().min(1),
});

export const WORKFORCE_COMMAND_PAYLOAD_SCHEMAS: Record<WorkforceCommandName, z.ZodTypeAny> = {
  InviteMember: InviteMemberPayloadSchema,
  ActivateMember: ActivateMemberPayloadSchema,
  ChangeMemberEmail: ChangeMemberEmailPayloadSchema,
  RequestMemberEmailChange: RequestMemberEmailChangePayloadSchema,
  ChangeDepartment: ChangeDepartmentPayloadSchema,
  ChangeRole: ChangeRolePayloadSchema,
  GrantAdditionalRole: GrantAdditionalRolePayloadSchema,
  EndAdditionalRole: EndAdditionalRolePayloadSchema,
  ChangeManager: ChangeManagerPayloadSchema,
  GrantDelegation: GrantDelegationPayloadSchema,
  RevokeDelegation: RevokeDelegationPayloadSchema,
  SuspendMember: SuspendMemberPayloadSchema,
  TerminateMember: TerminateMemberPayloadSchema,
  RehireMember: RehireMemberPayloadSchema,
  RetryAuthProviderSync: RetryAuthProviderSyncPayloadSchema,
};

export type RequestContext = {
  organizationId: string;
  actorMemberId: string;
  personId: string;
  authIdentityId: string;
  correlationId: string;
  effectiveAt: Date;
};
