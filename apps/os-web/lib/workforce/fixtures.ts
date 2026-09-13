import type { CapabilityStateReadModel, MemberSummaryReadModel } from '@isalwa/os-contracts';

export const sampleActiveMember: MemberSummaryReadModel = {
  memberId: 'member-1',
  organizationId: 'org-1',
  personId: 'person-1',
  givenName: 'Ana',
  familyName: 'Quispe',
  displayName: 'Ana Quispe',
  email: 'ana@empresa.bo',
  accessStatus: 'active',
  employmentStatus: 'active',
  employmentStartedAt: '2024-01-15T00:00:00.000Z',
  employmentEndedAt: null,
  roleKeys: ['sales_manager', 'people.admin'],
  departmentId: 'dept-1',
  departmentName: 'Ventas',
  managerMemberId: null,
  activeDelegationCount: 0,
};

export const sampleSuspendedMember: MemberSummaryReadModel = {
  ...sampleActiveMember,
  memberId: 'member-2',
  displayName: 'Carlos Mendoza',
  givenName: 'Carlos',
  familyName: 'Mendoza',
  email: 'carlos@empresa.bo',
  accessStatus: 'suspended',
  employmentStatus: 'active',
};

export const sampleTerminatedMember: MemberSummaryReadModel = {
  ...sampleActiveMember,
  memberId: 'member-3',
  displayName: 'Laura Vargas',
  givenName: 'Laura',
  familyName: 'Vargas',
  email: 'laura@empresa.bo',
  accessStatus: 'revoked',
  employmentStatus: 'terminated',
  employmentEndedAt: '2025-12-01T00:00:00.000Z',
};

export const sampleCapabilityStates: CapabilityStateReadModel[] = [
  {
    capabilityKey: 'workforce',
    organizationId: 'org-1',
    state: 'ACTIVE',
    implemented: true,
    source: 'registry',
    updatedAt: null,
  },
  {
    capabilityKey: 'commercial',
    organizationId: 'org-1',
    state: 'ACTIVE',
    implemented: true,
    source: 'registry',
    updatedAt: null,
  },
  {
    capabilityKey: 'finance',
    organizationId: 'org-1',
    state: 'LOCKED',
    implemented: false,
    source: 'registry',
    updatedAt: null,
  },
  {
    capabilityKey: 'messaging',
    organizationId: 'org-1',
    state: 'NOT_CONFIGURED',
    implemented: false,
    source: 'registry',
    updatedAt: null,
  },
  {
    capabilityKey: 'warehouse',
    organizationId: 'org-1',
    state: 'FUTURE',
    implemented: false,
    source: 'registry',
    updatedAt: null,
  },
];
