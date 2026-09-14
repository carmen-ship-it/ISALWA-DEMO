/**
 * Tenant predicate is an argument of every query. Implementations must apply
 * organizationId in the query, not fetch a tenant's rows and filter later,
 * and never fetch every organization.
 */

export type TenantPredicate = {
  organizationId: string;
};

export type WarehouseExitRow = {
  id: string;
  organizationId: string;
  orderId: string;
  exitedAt: Date;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  createdAt: Date;
};

export type OutboundNoteRow = {
  id: string;
  organizationId: string;
  warehouseExitId: string;
  orderId: string;
  documentKind: string;
  numberingPolicy: string | null;
  exitedAt: Date;
  bornAt: Date;
  createdAt: Date;
};

export type NoteLineRow = {
  id: string;
  organizationId: string;
  noteId: string;
  orderLineId: string;
  productRef: string | null;
  description: string;
  quantity: number;
  unitLabel: string | null;
};

export type DeliveryRow = {
  id: string;
  organizationId: string;
  orderId: string;
  deliveredAt: Date;
  deliveredTo: string | null;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  createdAt: Date;
};

export type DeliveryNoteRow = {
  id: string;
  organizationId: string;
  deliveryId: string;
  orderId: string;
  documentKind: string;
  numberingPolicy: string | null;
  deliveredAt: Date;
  bornAt: Date;
  createdAt: Date;
};

export type EvidenceRow = {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  role: string;
  recordedByMemberId: string;
  reference: string | null;
  note: string | null;
  paymentState: string | null;
  exceptionReason: string | null;
  authorizedByMemberId: string | null;
  recipient: string | null;
  signatureReference: string | null;
  confirmedLedgerPayment: boolean;
  ledgerPosting: string;
  createdAt: Date;
};

export type ReleaseDecisionRow = {
  id: string;
  organizationId: string;
  caseId: string;
  orderId: string;
  state: string;
  basis: string;
  reason: string;
  source: string;
  actorMemberId: string | null;
  actorLabel: string | null;
  decidedAt: Date;
  recordedAt: Date;
  evidenceText: string | null;
  evidenceReference: string | null;
  correctsDecisionId: string | null;
};

export type ReleaseReversalRow = {
  id: string;
  organizationId: string;
  decisionId: string;
  reason: string;
  actorMemberId: string | null;
  actorLabel: string | null;
  recordedAt: Date;
};

export type CoordinationDecisionRow = {
  id: string;
  organizationId: string;
  kind: string;
  decision: string;
  ownerLabel: string | null;
  ownerMemberId: string | null;
  dueAt: string | null;
  actorLabel: string;
  actorMemberId: string | null;
  occurredAt: Date;
  linkedCaseId: string | null;
  notes: string | null;
  resolvesDecisionId: string | null;
  recordedAt: Date;
};

export type WorkItemRow = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  title: string;
  status: string;
  subjectType: string | null;
  subjectId: string | null;
  dueAt: Date | null;
  createdAt: Date;
};

export type AttentionRow = {
  attentionKey: string;
  organizationId: string;
  memberId: string;
  attentionType: string;
  reasonCode: string;
  resourceType: string;
  resourceId: string;
  workItemId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  isActive: boolean;
};

export type IdPredicate = TenantPredicate & { id?: string; orderId?: string };

export interface FulfillmentReadDbPort {
  listWarehouseExits(predicate: IdPredicate): Promise<WarehouseExitRow[]>;
  listOutboundNotes(predicate: TenantPredicate & { orderId?: string; warehouseExitId?: string }): Promise<OutboundNoteRow[]>;
  listOutboundNoteLines(predicate: TenantPredicate & { outboundNoteIds: readonly string[] }): Promise<NoteLineRow[]>;
  listDeliveries(predicate: IdPredicate): Promise<DeliveryRow[]>;
  listDeliveryNotes(predicate: TenantPredicate & { orderId?: string; deliveryId?: string }): Promise<DeliveryNoteRow[]>;
  listDeliveryNoteLines(predicate: TenantPredicate & { deliveryNoteIds: readonly string[] }): Promise<NoteLineRow[]>;
  listEvidence(
    predicate: TenantPredicate & { subjectType: string; subjectIds: readonly string[] },
  ): Promise<EvidenceRow[]>;
  listReleaseDecisions(predicate: TenantPredicate & { id?: string; orderId?: string; caseId?: string }): Promise<ReleaseDecisionRow[]>;
  listReleaseReversals(predicate: TenantPredicate & { decisionIds: readonly string[] }): Promise<ReleaseReversalRow[]>;
  /**
   * Tenant-scoped coordination query. The reader must not call this until a
   * dedicated read capability exists. The method exists so the predicate is
   * implemented and tested independently of the denied reader.
   */
  listCoordinationDecisions(predicate: TenantPredicate & { id?: string }): Promise<CoordinationDecisionRow[]>;
  listWorkItems(
    predicate: TenantPredicate & { status?: string; subjectTypes?: readonly string[] },
  ): Promise<WorkItemRow[]>;
  listAttention(
    predicate: TenantPredicate & { isActive?: boolean; subjectTypes?: readonly string[] },
  ): Promise<AttentionRow[]>;
}
