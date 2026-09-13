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

export type IdempotencyRecord = {
  organizationId: string;
  key: string;
  commandName: string;
  resultJson: Record<string, unknown>;
  expiresAt: Date;
};
