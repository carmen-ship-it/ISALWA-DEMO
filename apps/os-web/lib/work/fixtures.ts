import type {
  ApprovalSummaryReadModel,
  AttentionItemReadModel,
  ProjectionFreshness,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';

export const freshProjection: ProjectionFreshness = {
  consumerKey: 'projection.work.summary.v1',
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
  pendingOutboxCount: 3,
};

export const sampleWork: WorkSummaryReadModel = {
  workItemId: 'work-1',
  organizationId: 'org-1',
  title: 'Seguimiento cliente ABC',
  description: 'Confirmar entrega de cotización',
  status: 'open',
  priority: 'high',
  ownerMemberId: 'mem-owner',
  createdByMemberId: 'mem-creator',
  subjectType: 'party',
  subjectId: 'party-1',
  dueAt: '2026-08-25T15:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  pendingApprovalId: null,
  approvalStatus: 'none',
  ownershipChangeCount: 0,
  lastOwnershipChangeAt: null,
};

export const overdueWork: WorkSummaryReadModel = {
  ...sampleWork,
  workItemId: 'work-2',
  title: 'Trabajo vencido',
  dueAt: '2026-01-01T10:00:00.000Z',
};

export const sampleApproval: ApprovalSummaryReadModel = {
  approvalRequestId: 'appr-1',
  organizationId: 'org-1',
  workItemId: 'work-1',
  subjectType: 'work_item',
  subjectId: 'work-1',
  requestedByMemberId: 'mem-requester',
  approverMemberId: 'mem-approver',
  status: 'pending',
  decisionByMemberId: null,
  decisionReason: null,
  decidedAt: null,
  requiredScope: null,
};

export const decidedApproval: ApprovalSummaryReadModel = {
  ...sampleApproval,
  approvalRequestId: 'appr-2',
  status: 'approved',
  decisionByMemberId: 'mem-approver',
  decidedAt: '2026-08-24T10:00:00.000Z',
};

export const sampleAttention: AttentionItemReadModel = {
  attentionKey: 'work:owner:work-1',
  organizationId: 'org-1',
  memberId: 'mem-owner',
  attentionType: 'open_work_assigned',
  reasonCode: 'work.open.owned',
  reasonDetail: {
    source: 'work_read_model',
    workItemId: 'work-1',
    title: 'Seguimiento cliente ABC',
    status: 'open',
  },
  resourceType: 'work_item',
  resourceId: 'work-1',
  workItemId: 'work-1',
  approvalRequestId: null,
  subjectType: 'party',
  subjectId: 'party-1',
  isActive: true,
};

export const approvalAttention: AttentionItemReadModel = {
  attentionKey: 'approval:approver:appr-1',
  organizationId: 'org-1',
  memberId: 'mem-approver',
  attentionType: 'pending_approval',
  reasonCode: 'approval.pending.for_you',
  reasonDetail: {
    source: 'approval_read_model',
    approvalRequestId: 'appr-1',
    workItemId: 'work-1',
    subjectType: 'work_item',
    subjectId: 'work-1',
  },
  resourceType: 'approval_request',
  resourceId: 'appr-1',
  workItemId: 'work-1',
  approvalRequestId: 'appr-1',
  subjectType: 'work_item',
  subjectId: 'work-1',
  isActive: true,
};
