import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  PartyTimelineEntryReadModel,
  QuoteDetailReadModel,
  QuoteSummaryReadModel,
} from '@isalwa/os-contracts';
import type { ProjectionFreshness } from '@isalwa/os-contracts';

export const freshProjection: ProjectionFreshness = {
  consumerKey: 'commercial.opportunities',
  organizationId: 'org-1',
  lastSuccessAt: '2026-08-24T12:00:00.000Z',
  lastEventOccurredAt: '2026-08-24T11:59:00.000Z',
  pendingOutboxCount: 0,
  isStale: false,
  lastError: null,
  rebuiltAt: null,
};

export const staleProjection: ProjectionFreshness = {
  ...freshProjection,
  isStale: true,
  pendingOutboxCount: 2,
};

export const sampleOpportunity: OpportunitySummaryReadModel = {
  opportunityId: 'opp-1',
  organizationId: 'org-1',
  partyId: 'party-1',
  commercialAccountId: 'ca-1',
  ownerMemberId: 'member-1',
  title: 'Reposición sanitarios — El Alto',
  stage: 'propuesta',
  status: 'open',
  expectedValueCentavos: '385000',
  closedAt: null,
  createdAt: '2026-08-20T10:00:00.000Z',
};

export const sampleQuote: QuoteSummaryReadModel = {
  quoteId: 'quote-1',
  organizationId: 'org-1',
  partyId: 'party-1',
  commercialAccountId: 'ca-1',
  opportunityId: 'opp-1',
  ownerMemberId: 'member-1',
  quoteNumber: 'Q-000001',
  status: 'submitted',
  currency: 'BOB',
  subtotalCentavos: '385000',
  headerDiscountCentavos: '0',
  totalCentavos: '385000',
  revisionNumber: 1,
  notes: null,
  submittedAt: '2026-08-21T14:00:00.000Z',
  cancelledAt: null,
  createdAt: '2026-08-21T12:00:00.000Z',
};

export const sampleQuoteDetail: QuoteDetailReadModel = {
  ...sampleQuote,
  lines: [
    {
      quoteLineId: 'line-1',
      quoteId: 'quote-1',
      lineNumber: 1,
      description: 'Lavamanos cerámico blanco',
      quantity: 10,
      unitLabel: 'pza',
      unitPriceCentavos: '18500',
      discountCentavos: '0',
      lineTotalCentavos: '185000',
      productRef: null,
    },
    {
      quoteLineId: 'line-2',
      quoteId: 'quote-1',
      lineNumber: 2,
      description: 'Inodoro tanque bajo',
      quantity: 8,
      unitLabel: 'pza',
      unitPriceCentavos: '25000',
      discountCentavos: '0',
      lineTotalCentavos: '200000',
      productRef: null,
    },
  ],
};

export const sampleOrder: OrderSummaryReadModel = {
  orderId: 'order-1',
  organizationId: 'org-1',
  partyId: 'party-1',
  commercialAccountId: 'ca-1',
  quoteId: 'quote-1',
  ownerMemberId: 'member-1',
  orderNumber: 'PED-2026-001',
  status: 'open',
  currency: 'BOB',
  subtotalCentavos: '385000',
  headerDiscountCentavos: '0',
  totalCentavos: '385000',
  cancelledAt: null,
  createdAt: '2026-08-22T09:00:00.000Z',
};

export const samplePartyTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-1',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'opportunity.created',
  occurredAt: '2026-08-20T10:00:00.000Z',
  actorMemberId: 'member-1',
  correlationId: 'corr-1',
  primaryEntityType: 'opportunity',
  primaryEntityId: 'opp-1',
  facts: {
    opportunityId: 'opp-1',
    title: 'Reposición sanitarios — El Alto',
    stage: 'propuesta',
    status: 'open',
    partyId: 'party-1',
  },
};

export const sampleCommercialTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-2',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'quote.submitted',
  occurredAt: '2026-08-21T14:00:00.000Z',
  actorMemberId: 'member-1',
  correlationId: 'corr-2',
  primaryEntityType: 'quote',
  primaryEntityId: 'quote-1',
  facts: {
    quoteId: 'quote-1',
    quoteNumber: 'Q-000001',
    status: 'submitted',
    totalCentavos: '385000',
  },
};

export const sampleWorkCreatedTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-w1',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'work.created',
  occurredAt: '2026-08-22T08:00:00.000Z',
  actorMemberId: 'member-1',
  correlationId: 'corr-w1',
  primaryEntityType: 'work_item',
  primaryEntityId: 'work-1',
  facts: {
    workItemId: 'work-1',
    ownerMemberId: 'member-1',
    title: 'Seguimiento cotización',
    subjectType: 'party',
    subjectId: 'party-1',
  },
};

export const sampleWorkReassignedTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-w2',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'task.reassigned',
  occurredAt: '2026-08-22T09:00:00.000Z',
  actorMemberId: 'member-1',
  correlationId: 'corr-w2',
  primaryEntityType: 'work_item',
  primaryEntityId: 'work-1',
  facts: {
    workItemId: 'work-1',
    newOwnerMemberId: 'member-2',
    previousOwnerMemberId: 'member-1',
  },
};

export const sampleWorkCompletedTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-w3',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'work.completed',
  occurredAt: '2026-08-22T10:00:00.000Z',
  actorMemberId: 'member-2',
  correlationId: 'corr-w3',
  primaryEntityType: 'work_item',
  primaryEntityId: 'work-1',
  facts: { workItemId: 'work-1' },
};

export const sampleWorkCancelledTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-w4',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'work.cancelled',
  occurredAt: '2026-08-22T11:00:00.000Z',
  actorMemberId: 'member-1',
  correlationId: 'corr-w4',
  primaryEntityType: 'work_item',
  primaryEntityId: 'work-1',
  facts: { workItemId: 'work-1', reason: 'Cliente pospuso decisión' },
};

export const sampleApprovalRequestedTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-a1',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'approval.requested',
  occurredAt: '2026-08-22T12:00:00.000Z',
  actorMemberId: 'member-1',
  correlationId: 'corr-a1',
  primaryEntityType: 'approval_request',
  primaryEntityId: 'appr-1',
  facts: {
    approvalRequestId: 'appr-1',
    approverMemberId: 'member-3',
    workItemId: 'work-1',
    subjectType: 'party',
    subjectId: 'party-1',
  },
};

export const sampleApprovalApprovedTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-a2',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'approval.approved',
  occurredAt: '2026-08-22T13:00:00.000Z',
  actorMemberId: 'member-3',
  correlationId: 'corr-a2',
  primaryEntityType: 'approval_request',
  primaryEntityId: 'appr-1',
  facts: {
    approvalRequestId: 'appr-1',
    subjectType: 'party',
    subjectId: 'party-1',
    requestedByMemberId: 'member-1',
    approverMemberId: 'member-3',
    decision: 'approved',
    decisionByMemberId: 'member-3',
    decidedAt: '2026-08-22T13:00:00.000Z',
  },
};

export const sampleApprovalRejectedTimelineEntry: PartyTimelineEntryReadModel = {
  entryId: 'tl-a3',
  organizationId: 'org-1',
  partyId: 'party-1',
  eventType: 'approval.rejected',
  occurredAt: '2026-08-22T14:00:00.000Z',
  actorMemberId: 'member-3',
  correlationId: 'corr-a3',
  primaryEntityType: 'approval_request',
  primaryEntityId: 'appr-2',
  facts: {
    approvalRequestId: 'appr-2',
    subjectType: 'work_item',
    subjectId: 'work-1',
    requestedByMemberId: 'member-1',
    approverMemberId: 'member-3',
    decision: 'rejected',
    decisionByMemberId: 'member-3',
    decidedAt: '2026-08-22T14:00:00.000Z',
    reason: 'Falta documentación',
  },
};
