import type {
  AttentionRow,
  CoordinationDecisionRow,
  DeliveryNoteRow,
  DeliveryRow,
  EvidenceRow,
  FulfillmentReadDbPort,
  NoteLineRow,
  OutboundNoteRow,
  ReleaseDecisionRow,
  ReleaseReversalRow,
  TenantPredicate,
  WarehouseExitRow,
  WorkItemRow,
} from './db-port';

type FindMany<T> = (args: { where: Record<string, unknown> }) => Promise<T[]>;

/**
 * Structural Prisma delegates for the models this reader queries.
 * OsWorkReadModel is not a delegate. Work truth stays on OsWorkItem.
 */
export type FulfillmentPrismaDb = {
  osWarehouseExit: { findMany: FindMany<WarehouseExitRow> };
  osWarehouseOutboundNote: { findMany: FindMany<OutboundNoteRow> };
  osWarehouseOutboundNoteLine: { findMany: FindMany<NoteLineRow & { outboundNoteId: string }> };
  osDelivery: { findMany: FindMany<DeliveryRow> };
  osDeliveryNote: { findMany: FindMany<DeliveryNoteRow> };
  osDeliveryNoteLine: { findMany: FindMany<NoteLineRow & { deliveryNoteId: string }> };
  osDeliveryEvidence: { findMany: FindMany<EvidenceRow> };
  osOperationalReleaseDecision: { findMany: FindMany<ReleaseDecisionRow> };
  osOperationalReleaseDecisionReversal: { findMany: FindMany<ReleaseReversalRow> };
  osCoordinationDecision: { findMany: FindMany<CoordinationDecisionRow> };
  osWorkItem: { findMany: FindMany<WorkItemRow> };
  osAttentionReadModel: { findMany: FindMany<AttentionRow> };
};

function orgWhere(organizationId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  if (!organizationId) throw new Error('TENANT_FORBIDDEN');
  return { organizationId, ...extra };
}

function idIn(ids: readonly string[]): { in: string[] } | null {
  if (ids.length === 0) return null;
  return { in: [...ids] };
}

function mapLine(row: NoteLineRow & { outboundNoteId?: string; deliveryNoteId?: string }, noteId: string): NoteLineRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    noteId,
    orderLineId: row.orderLineId,
    productRef: row.productRef,
    description: row.description,
    quantity: row.quantity,
    unitLabel: row.unitLabel,
  };
}

/** Prisma adapter. Every findMany where includes organizationId from the predicate. */
export function createPrismaFulfillmentReadDb(db: FulfillmentPrismaDb): FulfillmentReadDbPort {
  return {
    async listWarehouseExits(predicate) {
      return db.osWarehouseExit.findMany({
        where: orgWhere(predicate.organizationId, {
          ...(predicate.id ? { id: predicate.id } : {}),
          ...(predicate.orderId ? { orderId: predicate.orderId } : {}),
        }),
      });
    },
    async listOutboundNotes(predicate) {
      return db.osWarehouseOutboundNote.findMany({
        where: orgWhere(predicate.organizationId, {
          ...(predicate.orderId ? { orderId: predicate.orderId } : {}),
          ...(predicate.warehouseExitId ? { warehouseExitId: predicate.warehouseExitId } : {}),
        }),
      });
    },
    async listOutboundNoteLines(predicate) {
      const ids = idIn(predicate.outboundNoteIds);
      if (!ids) return [];
      const rows = await db.osWarehouseOutboundNoteLine.findMany({
        where: orgWhere(predicate.organizationId, { outboundNoteId: ids }),
      });
      return rows.map((row) => mapLine(row, row.outboundNoteId));
    },
    async listDeliveries(predicate) {
      return db.osDelivery.findMany({
        where: orgWhere(predicate.organizationId, {
          ...(predicate.id ? { id: predicate.id } : {}),
          ...(predicate.orderId ? { orderId: predicate.orderId } : {}),
        }),
      });
    },
    async listDeliveryNotes(predicate) {
      return db.osDeliveryNote.findMany({
        where: orgWhere(predicate.organizationId, {
          ...(predicate.orderId ? { orderId: predicate.orderId } : {}),
          ...(predicate.deliveryId ? { deliveryId: predicate.deliveryId } : {}),
        }),
      });
    },
    async listDeliveryNoteLines(predicate) {
      const ids = idIn(predicate.deliveryNoteIds);
      if (!ids) return [];
      const rows = await db.osDeliveryNoteLine.findMany({
        where: orgWhere(predicate.organizationId, { deliveryNoteId: ids }),
      });
      return rows.map((row) => mapLine(row, row.deliveryNoteId));
    },
    async listEvidence(predicate) {
      const ids = idIn(predicate.subjectIds);
      if (!ids) return [];
      return db.osDeliveryEvidence.findMany({
        where: orgWhere(predicate.organizationId, { subjectType: predicate.subjectType, subjectId: ids }),
      });
    },
    async listReleaseDecisions(predicate) {
      return db.osOperationalReleaseDecision.findMany({
        where: orgWhere(predicate.organizationId, {
          ...(predicate.id ? { id: predicate.id } : {}),
          ...(predicate.orderId ? { orderId: predicate.orderId } : {}),
          ...(predicate.caseId ? { caseId: predicate.caseId } : {}),
        }),
      });
    },
    async listReleaseReversals(predicate) {
      const ids = idIn(predicate.decisionIds);
      if (!ids) return [];
      return db.osOperationalReleaseDecisionReversal.findMany({
        where: orgWhere(predicate.organizationId, { decisionId: ids }),
      });
    },
    async listCoordinationDecisions(_predicate) {
      throw new Error('CROSS_LANE_CHANGE_REQUEST');
    },
    async listWorkItems(predicate) {
      return db.osWorkItem.findMany({
        where: orgWhere(predicate.organizationId, {
          ...(predicate.status ? { status: predicate.status } : {}),
          ...(predicate.subjectTypes ? { subjectType: { in: [...predicate.subjectTypes] } } : {}),
        }),
      });
    },
    async listAttention(predicate) {
      return db.osAttentionReadModel.findMany({
        where: orgWhere(predicate.organizationId, {
          ...(predicate.isActive !== undefined ? { isActive: predicate.isActive } : {}),
          ...(predicate.subjectTypes ? { subjectType: { in: [...predicate.subjectTypes] } } : {}),
        }),
      });
    },
  };
}
