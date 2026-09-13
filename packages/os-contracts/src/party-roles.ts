/** Canonical Party role keys — one Party may hold many simultaneously (ADR-0004). */
export const PARTY_ROLE_KEYS = [
  'customer',
  'supplier',
  'vendor',
  'distributor',
  'partner',
  'contractor',
  'logistics_provider',
  'financial_counterparty',
] as const;

export type PartyRoleKey = (typeof PARTY_ROLE_KEYS)[number];

export const PARTY_KINDS = ['organization', 'person'] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

export const PARTY_STATUSES = ['active', 'inactive', 'merged'] as const;
export type PartyStatus = (typeof PARTY_STATUSES)[number];

export const LEAD_STATUSES = ['open', 'resolved', 'discarded'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const MERGE_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type MergeRequestStatus = (typeof MERGE_REQUEST_STATUSES)[number];
