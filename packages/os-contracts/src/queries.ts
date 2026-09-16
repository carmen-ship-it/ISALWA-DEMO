import { z } from 'zod';

/** Cursor pagination — Step 9 §5.7. */
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CursorPagination = z.infer<typeof CursorPaginationSchema>;

export const PaginatedMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  limit: z.number().int(),
  hasMore: z.boolean(),
});

export type PaginatedMeta = z.infer<typeof PaginatedMetaSchema>;

export const SearchPartiesQuerySchema = CursorPaginationSchema.extend({
  q: z.string().trim().optional(),
  status: z.enum(['active', 'deactivated', 'merged']).optional(),
  roleKey: z.string().trim().optional(),
});

export type SearchPartiesQuery = z.infer<typeof SearchPartiesQuerySchema>;

export const PartySummaryReadModelSchema = z.object({
  partyId: z.string(),
  organizationId: z.string(),
  partyKind: z.string(),
  displayName: z.string(),
  legalName: z.string().nullable(),
  status: z.string(),
  activeRoleKeys: z.array(z.string()),
  hasCommercialAccount: z.boolean(),
  commercialAccountStatus: z.string().nullable(),
  mergedIntoPartyId: z.string().nullable(),
  duplicateStatus: z.enum(['suggested', 'pending_merge', 'none']).nullable(),
  searchText: z.string(),
  /** Stored contact phone. Absent when the search response was not enriched. */
  primaryPhone: z.string().nullable().optional(),
  /** Commercial-account owner. Null means no owner was stored, not an inferred role. */
  commercialOwnerMemberId: z.string().nullable().optional(),
  /** True only when an active location has coordinates. A Maps link is not enough. */
  hasCoordinates: z.boolean().optional(),
  /** Provenance only. Not a map coordinate and not a geocode. */
  locationProvenanceUrl: z.string().nullable().optional(),
});

export type PartySummaryReadModel = z.infer<typeof PartySummaryReadModelSchema>;

export const ProjectionFreshnessSchema = z.object({
  consumerKey: z.string(),
  organizationId: z.string(),
  lastSuccessAt: z.string().datetime().nullable(),
  lastEventOccurredAt: z.string().datetime().nullable(),
  pendingOutboxCount: z.number().int(),
  isStale: z.boolean(),
  lastError: z.string().nullable(),
  rebuiltAt: z.string().datetime().nullable(),
});

export type ProjectionFreshness = z.infer<typeof ProjectionFreshnessSchema>;

/** Approved query names — handoff-manifest.yaml queries section. */
export const OS_QUERY_NAMES = [
  'GetMember',
  'ListMembers',
  'GetMemberEffectiveAuth',
  'GetParty',
  'ListPartyTimeline',
  'SearchParties',
  'GetPartyRoles',
  'ListOpenWork',
  'GetApproval',
  'ListPendingApprovals',
  'ListAttentionItems',
  'ListOpportunities',
  'GetOpportunity',
  'ListQuotes',
  'GetQuote',
  'ListOrders',
  'GetOrder',
  'GetFinanceProjection',
  'GetCapabilityState',
  'GetIntegrationHealth',
] as const;

export type OsQueryName = (typeof OS_QUERY_NAMES)[number];

export const ATTENTION_TYPES = [
  'open_work_assigned',
  'overdue_work',
  'pending_approval',
  'reassigned_work',
] as const;

export type AttentionType = (typeof ATTENTION_TYPES)[number];

/** Explicit read lens. Omitted keeps the existing personal (or people.admin) list. */
export const COMMERCIAL_VISIBILITY_MODES = ['own', 'team', 'org'] as const;
export type CommercialVisibilityMode = (typeof COMMERCIAL_VISIBILITY_MODES)[number];

export const ListOpenWorkQuerySchema = CursorPaginationSchema.extend({
  q: z.string().trim().max(80).optional(),
  ownerMemberId: z.string().trim().optional(),
  status: z.enum(['open', 'completed', 'cancelled']).optional(),
  subjectType: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  visibility: z.enum(COMMERCIAL_VISIBILITY_MODES).optional(),
  /** Open work with dueAt before the server clock. Not a client-supplied cutoff. */
  overdue: z.coerce.boolean().optional(),
  /** Open follow-up work (party / commercial account subject). Read only. */
  followUpOnly: z.coerce.boolean().optional(),
});

export type ListOpenWorkQuery = z.infer<typeof ListOpenWorkQuerySchema>;

export const ListPendingApprovalsQuerySchema = CursorPaginationSchema.extend({
  approverMemberId: z.string().trim().optional(),
  workItemId: z.string().trim().optional(),
});

export type ListPendingApprovalsQuery = z.infer<typeof ListPendingApprovalsQuerySchema>;

export const ListAttentionQuerySchema = CursorPaginationSchema.extend({
  attentionType: z.enum(ATTENTION_TYPES).optional(),
  activeOnly: z.coerce.boolean().default(true),
});

export type ListAttentionQuery = z.infer<typeof ListAttentionQuerySchema>;

export const WorkSummaryReadModelSchema = z.object({
  workItemId: z.string(),
  organizationId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  ownerMemberId: z.string(),
  createdByMemberId: z.string(),
  subjectType: z.string().nullable(),
  subjectId: z.string().nullable(),
  dueAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  pendingApprovalId: z.string().nullable(),
  approvalStatus: z.enum(['none', 'pending', 'approved', 'rejected']),
  ownershipChangeCount: z.number().int(),
  lastOwnershipChangeAt: z.string().datetime().nullable(),
});

export type WorkSummaryReadModel = z.infer<typeof WorkSummaryReadModelSchema>;

export const ApprovalSummaryReadModelSchema = z.object({
  approvalRequestId: z.string(),
  organizationId: z.string(),
  workItemId: z.string().nullable(),
  subjectType: z.string(),
  subjectId: z.string(),
  requestedByMemberId: z.string(),
  approverMemberId: z.string(),
  status: z.string(),
  decisionByMemberId: z.string().nullable(),
  decisionReason: z.string().nullable(),
  decidedAt: z.string().datetime().nullable(),
  requiredScope: z.string().nullable(),
});

export type ApprovalSummaryReadModel = z.infer<typeof ApprovalSummaryReadModelSchema>;

export const AttentionItemReadModelSchema = z.object({
  attentionKey: z.string(),
  organizationId: z.string(),
  memberId: z.string(),
  attentionType: z.enum(ATTENTION_TYPES),
  reasonCode: z.string(),
  reasonDetail: z.record(z.unknown()),
  resourceType: z.enum(['work_item', 'approval_request']),
  resourceId: z.string(),
  workItemId: z.string().nullable(),
  approvalRequestId: z.string().nullable(),
  subjectType: z.string().nullable(),
  subjectId: z.string().nullable(),
  isActive: z.boolean(),
});

export type AttentionItemReadModel = z.infer<typeof AttentionItemReadModelSchema>;

const centavosStringSchema = z.string().regex(/^-?\d+$/);

export const OpportunitySummaryReadModelSchema = z.object({
  opportunityId: z.string(),
  organizationId: z.string(),
  partyId: z.string(),
  commercialAccountId: z.string().nullable(),
  ownerMemberId: z.string(),
  title: z.string(),
  stage: z.string(),
  status: z.string(),
  expectedValueCentavos: centavosStringSchema.nullable(),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type OpportunitySummaryReadModel = z.infer<typeof OpportunitySummaryReadModelSchema>;

export const QuoteSummaryReadModelSchema = z.object({
  quoteId: z.string(),
  organizationId: z.string(),
  partyId: z.string(),
  commercialAccountId: z.string().nullable(),
  opportunityId: z.string().nullable(),
  ownerMemberId: z.string(),
  quoteNumber: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotalCentavos: centavosStringSchema,
  headerDiscountCentavos: centavosStringSchema,
  totalCentavos: centavosStringSchema,
  revisionNumber: z.number().int(),
  notes: z.string().nullable(),
  submittedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type QuoteSummaryReadModel = z.infer<typeof QuoteSummaryReadModelSchema>;

export const QuoteLineReadModelSchema = z.object({
  quoteLineId: z.string(),
  quoteId: z.string(),
  lineNumber: z.number().int(),
  description: z.string(),
  quantity: z.number().int(),
  unitLabel: z.string().nullable(),
  unitPriceCentavos: centavosStringSchema,
  discountCentavos: centavosStringSchema,
  lineTotalCentavos: centavosStringSchema,
  productRef: z.string().nullable(),
});

export type QuoteLineReadModel = z.infer<typeof QuoteLineReadModelSchema>;

export const QuoteDetailReadModelSchema = QuoteSummaryReadModelSchema.extend({
  lines: z.array(QuoteLineReadModelSchema),
});

export type QuoteDetailReadModel = z.infer<typeof QuoteDetailReadModelSchema>;

export const OrderSummaryReadModelSchema = z.object({
  orderId: z.string(),
  organizationId: z.string(),
  partyId: z.string(),
  commercialAccountId: z.string().nullable(),
  quoteId: z.string(),
  ownerMemberId: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotalCentavos: centavosStringSchema,
  headerDiscountCentavos: centavosStringSchema,
  totalCentavos: centavosStringSchema,
  cancelledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type OrderSummaryReadModel = z.infer<typeof OrderSummaryReadModelSchema>;

export const ListOpportunitiesQuerySchema = CursorPaginationSchema.extend({
  q: z.string().trim().max(80).optional(),
  status: z.string().trim().optional(),
  stage: z.string().trim().optional(),
  partyId: z.string().trim().optional(),
  ownerMemberId: z.string().trim().optional(),
  visibility: z.enum(COMMERCIAL_VISIBILITY_MODES).optional(),
});

export type ListOpportunitiesQuery = z.infer<typeof ListOpportunitiesQuerySchema>;

export const ListQuotesQuerySchema = CursorPaginationSchema.extend({
  q: z.string().trim().max(80).optional(),
  status: z.string().trim().optional(),
  partyId: z.string().trim().optional(),
  opportunityId: z.string().trim().optional(),
  ownerMemberId: z.string().trim().optional(),
  visibility: z.enum(COMMERCIAL_VISIBILITY_MODES).optional(),
});

export type ListQuotesQuery = z.infer<typeof ListQuotesQuerySchema>;

export const ListOrdersQuerySchema = CursorPaginationSchema.extend({
  q: z.string().trim().max(80).optional(),
  status: z.string().trim().optional(),
  partyId: z.string().trim().optional(),
  quoteId: z.string().trim().optional(),
  ownerMemberId: z.string().trim().optional(),
});

export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;

export const PartyTimelineFactsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export type PartyTimelineFacts = z.infer<typeof PartyTimelineFactsSchema>;

export const PartyTimelineEntryReadModelSchema = z.object({
  entryId: z.string(),
  organizationId: z.string(),
  partyId: z.string(),
  eventType: z.string(),
  occurredAt: z.string().datetime(),
  actorMemberId: z.string().nullable(),
  correlationId: z.string(),
  primaryEntityType: z.string(),
  primaryEntityId: z.string(),
  facts: PartyTimelineFactsSchema,
});

export type PartyTimelineEntryReadModel = z.infer<typeof PartyTimelineEntryReadModelSchema>;

export const ListPartyTimelineQuerySchema = CursorPaginationSchema;

export type ListPartyTimelineQuery = z.infer<typeof ListPartyTimelineQuerySchema>;

export const MemberSummaryReadModelSchema = z.object({
  memberId: z.string(),
  organizationId: z.string(),
  personId: z.string(),
  givenName: z.string(),
  familyName: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  accessStatus: z.string(),
  employmentStatus: z.string(),
  employmentStartedAt: z.string().datetime().nullable(),
  employmentEndedAt: z.string().datetime().nullable(),
  roleKeys: z.array(z.string()),
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  managerMemberId: z.string().nullable(),
  activeDelegationCount: z.number().int(),
});

export type MemberSummaryReadModel = z.infer<typeof MemberSummaryReadModelSchema>;

export const ListMembersQuerySchema = CursorPaginationSchema.extend({
  q: z.string().trim().optional(),
  accessStatus: z.string().trim().optional(),
  employmentStatus: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
});

export type ListMembersQuery = z.infer<typeof ListMembersQuerySchema>;

export const TERMINATION_IMPACT_CATEGORY_KEYS = [
  'open_work',
  'commercial_accounts',
  'open_opportunities',
  'active_quotes',
  'active_orders',
  'pending_approvals',
  'direct_reports',
  'active_delegations',
  'primary_customer_coverage',
  'acting_customer_coverage',
  'owned_issues',
  'open_commitments',
] as const;

export type TerminationImpactCategoryKey = (typeof TERMINATION_IMPACT_CATEGORY_KEYS)[number];

export const TerminationImpactItemSchema = z.object({
  id: z.string(),
  summary: z.string(),
});

export type TerminationImpactItem = z.infer<typeof TerminationImpactItemSchema>;

export const TerminationImpactCategorySchema = z.object({
  key: z.enum(TERMINATION_IMPACT_CATEGORY_KEYS),
  /** Spanish operator-facing label (not a business-event type). */
  label: z.string(),
  count: z.number().int().nonnegative(),
  items: z.array(TerminationImpactItemSchema),
  foundationGaps: z.array(z.string()).optional(),
});

export type TerminationImpactCategory = z.infer<typeof TerminationImpactCategorySchema>;

export const TerminationImpactReadModelSchema = z.object({
  memberId: z.string(),
  organizationId: z.string(),
  canTerminate: z.boolean(),
  totalBlockingCount: z.number().int().nonnegative(),
  categories: z.array(TerminationImpactCategorySchema),
});

export type TerminationImpactReadModel = z.infer<typeof TerminationImpactReadModelSchema>;

export const MemberAccessHistoryEntrySchema = z.object({
  id: z.string(),
  occurredAt: z.string().datetime(),
  label: z.string(),
  detail: z.string().nullable(),
  actorMemberId: z.string().nullable(),
});

export type MemberAccessHistoryEntryReadModel = z.infer<typeof MemberAccessHistoryEntrySchema>;

export const MemberAccessHistoryResponseSchema = z.object({
  items: z.array(MemberAccessHistoryEntrySchema),
});

export type MemberAccessHistoryResponse = z.infer<typeof MemberAccessHistoryResponseSchema>;

export const CapabilityStateReadModelSchema = z.object({
  capabilityKey: z.string(),
  organizationId: z.string(),
  state: z.string(),
  implemented: z.boolean(),
  source: z.enum(['registry', 'org_override']),
  updatedAt: z.string().datetime().nullable(),
});

export type CapabilityStateReadModel = z.infer<typeof CapabilityStateReadModelSchema>;
