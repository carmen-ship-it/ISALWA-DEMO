export const EMPLOYMENT_STATUSES = [
  'pending_start',
  'active',
  'on_leave',
  'terminated',
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const ACCESS_STATUSES = ['invited', 'active', 'suspended', 'revoked'] as const;

export type AccessStatus = (typeof ACCESS_STATUSES)[number];

export const AUTH_IDENTITY_STATUSES = ['invited', 'active', 'revoked'] as const;

export type AuthIdentityStatus = (typeof AUTH_IDENTITY_STATUSES)[number];
