export type OrganizationRecord = {
  id: string;
  legalName: string;
  slug: string;
  status: string;
};

export type PersonRecord = {
  id: string;
  givenName: string;
  familyName: string;
  version: number;
};

export type MemberRecord = {
  id: string;
  organizationId: string;
  personId: string;
  employmentStatus: string;
  accessStatus: string;
  employmentStartedAt: Date | null;
  employmentEndedAt: Date | null;
  version: number;
};

export type AuthIdentityRecord = {
  id: string;
  personId: string;
  provider: string;
  providerSubject: string | null;
  email: string;
  status: string;
  invitedAt: Date | null;
  activatedAt: Date | null;
  revokedAt: Date | null;
};

export type RoleAssignmentRecord = {
  id: string;
  organizationId: string;
  memberId: string;
  roleKey: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type DepartmentRecord = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
};

export type DepartmentAssignmentRecord = {
  id: string;
  organizationId: string;
  memberId: string;
  departmentId: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type ManagerAssignmentRecord = {
  id: string;
  organizationId: string;
  memberId: string;
  managerMemberId: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export type DelegationRecord = {
  id: string;
  organizationId: string;
  delegatorMemberId: string;
  delegateMemberId: string;
  scopes: string[];
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type WorkItemRecord = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  title: string;
  status: string;
  version: number;
};

/** Commercial account owned by a member (termination continuity). */
export type OwnedCommercialAccountRecord = {
  id: string;
  organizationId: string;
  partyId: string;
  ownerMemberId: string;
  status: string;
};

/** Opportunity owned by a member with open status. */
export type OwnedOpportunityRecord = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  title: string;
  status: string;
};

/** Quote owned by a member that is not cancelled (no closed status in product enum). */
export type OwnedQuoteRecord = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  quoteNumber: string;
  status: string;
};

/** Active (open) order owned by a member. */
export type OwnedOrderRecord = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  orderNumber: string;
  status: string;
};

/** Pending approval where the member is the approver. */
export type PendingApprovalForMemberRecord = {
  id: string;
  organizationId: string;
  approverMemberId: string;
  subjectType: string;
  subjectId: string;
  status: string;
};

/**
 * Active customer coverage grant involving the member as primary owner or acting advisor.
 * Distinct from CommercialAccount.ownerMemberId.
 */
export type ActiveCustomerCoverageRecord = {
  id: string;
  organizationId: string;
  customerPartyId: string;
  customerDisplayName: string | null;
  primaryOwnerMemberId: string;
  actingAdvisorMemberId: string;
  role: 'primary' | 'acting';
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
};

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};
