/** Proposed admin scopes — display labels configurable per org (RD-01). */
export const ADMIN_SCOPE_KEYS = [
  'people.admin',
  'master_data.admin',
  'fiscal.admin',
  'org.admin',
  'integration.admin',
] as const;

/**
 * Provisional pilot read scopes (Leadership Visibility V1).
 * Explicit assignment only. Not admin, not write, not approval, not cargo-mapped.
 * Reversible: omit the assignment and these scopes grant nothing.
 */
export const COMMERCIAL_READ_SCOPE_KEYS = ['commercial.team.read', 'commercial.org.read'] as const;

export type CommercialReadScopeKey = (typeof COMMERCIAL_READ_SCOPE_KEYS)[number];

export const COMMERCIAL_TEAM_READ_SCOPE: CommercialReadScopeKey = 'commercial.team.read';
export const COMMERCIAL_ORG_READ_SCOPE: CommercialReadScopeKey = 'commercial.org.read';

/**
 * Provisional V1 pilot write authorities. Explicit assignment only.
 * Not implied by people.admin, leadership read scopes, Cargo, or title.
 * Reversible: omit the assignment and these scopes grant nothing.
 */
export const COMMERCIAL_AUTHORITY_SCOPE_KEYS = [
  'commercial.order.convert',
  'commercial.account.reassign',
] as const;

export type CommercialAuthorityScopeKey = (typeof COMMERCIAL_AUTHORITY_SCOPE_KEYS)[number];

export const COMMERCIAL_ORDER_CONVERT_SCOPE: CommercialAuthorityScopeKey =
  'commercial.order.convert';
export const COMMERCIAL_ACCOUNT_REASSIGN_SCOPE: CommercialAuthorityScopeKey =
  'commercial.account.reassign';

/**
 * Explicit additional assignments. GrantAdditionalRole may add one of these
 * without ending other active role assignments. Not inferred from Cargo,
 * title, department, or another member's permissions. people.admin may
 * administer the assignment and does not receive the capability by doing so.
 */
export const ADDITIONAL_ASSIGNABLE_SCOPE_KEYS = [
  ...COMMERCIAL_READ_SCOPE_KEYS,
  ...COMMERCIAL_AUTHORITY_SCOPE_KEYS,
] as const;

export type AdditionalAssignableScopeKey = (typeof ADDITIONAL_ASSIGNABLE_SCOPE_KEYS)[number];

export function isAdditionalAssignableScope(value: string): value is AdditionalAssignableScopeKey {
  return (ADDITIONAL_ASSIGNABLE_SCOPE_KEYS as readonly string[]).includes(value);
}

export type AdminScopeKey = (typeof ADMIN_SCOPE_KEYS)[number];

/** Command → required scope (minimum). */
export const COMMAND_REQUIRED_SCOPES: Record<string, AdminScopeKey | 'member_active'> = {
  InviteMember: 'people.admin',
  ActivateMember: 'member_active',
  ChangeMemberEmail: 'member_active',
  RequestMemberEmailChange: 'member_active',
  ChangeDepartment: 'people.admin',
  ChangeRole: 'people.admin',
  GrantAdditionalRole: 'people.admin',
  EndAdditionalRole: 'people.admin',
  ChangeManager: 'people.admin',
  GrantDelegation: 'people.admin',
  RevokeDelegation: 'people.admin',
  SuspendMember: 'people.admin',
  TerminateMember: 'people.admin',
  RehireMember: 'people.admin',
  RetryAuthProviderSync: 'people.admin',
  CreateWorkItem: 'member_active',
  ReassignWork: 'people.admin',
  CompleteWork: 'member_active',
  CancelWorkItem: 'member_active',
  RequestApproval: 'member_active',
  Approve: 'member_active',
  Reject: 'member_active',
  CreateParty: 'master_data.admin',
  UpdateParty: 'master_data.admin',
  DeactivateParty: 'master_data.admin',
  ReactivateParty: 'master_data.admin',
  AssignPartyRole: 'master_data.admin',
  EndPartyRole: 'master_data.admin',
  UpdateContact: 'master_data.admin',
  UpdateFiscalIdentity: 'fiscal.admin',
  CreateLead: 'master_data.admin',
  ResolveLead: 'master_data.admin',
  RequestPartyMerge: 'master_data.admin',
  ApprovePartyMerge: 'org.admin',
  RejectPartyMerge: 'org.admin',
  CreateLocation: 'master_data.admin',
  UpdateLocation: 'master_data.admin',
  DeactivateLocation: 'master_data.admin',
  DryRunClientImport: 'master_data.admin',
  ValidateClientImport: 'master_data.admin',
  ExecuteClientImport: 'master_data.admin',
  ReverseImportBatch: 'master_data.admin',
  GetImportBatchReceipt: 'master_data.admin',
  RetryDeadLetterDelivery: 'people.admin',
  CreateOpportunity: 'member_active',
  UpdateOpportunity: 'member_active',
  ChangeOpportunityStage: 'member_active',
  CloseOpportunity: 'member_active',
  AssignOpportunityOwner: 'member_active',
  CreateQuote: 'member_active',
  AddQuoteLine: 'member_active',
  UpdateQuoteLine: 'member_active',
  RemoveQuoteLine: 'member_active',
  UpdateQuote: 'member_active',
  SubmitQuote: 'member_active',
  CancelQuote: 'member_active',
  CreateOrder: 'member_active',
  CancelOrder: 'member_active',
  ReassignCommercialAccountOwner: 'member_active',
};
