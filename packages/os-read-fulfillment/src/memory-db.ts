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

export type RecordedQuery = {
  method: string;
  predicate: TenantPredicate & Record<string, unknown>;
};

function sameOrg<T extends { organizationId: string }>(organizationId: string, rows: readonly T[]): T[] {
  return rows.filter((row) => row.organizationId === organizationId);
}

function requireOrg(predicate: TenantPredicate): string {
  if (!predicate.organizationId) throw new Error('TENANT_FORBIDDEN');
  return predicate.organizationId;
}

/**
 * In-memory db port. Every method applies organizationId before returning.
 * An empty id list does not scan other notes.
 */
export class MemoryFulfillmentReadDb implements FulfillmentReadDbPort {
  readonly calls: RecordedQuery[] = [];

  warehouseExits: WarehouseExitRow[] = [];
  outboundNotes: OutboundNoteRow[] = [];
  outboundLines: NoteLineRow[] = [];
  deliveries: DeliveryRow[] = [];
  deliveryNotes: DeliveryNoteRow[] = [];
  deliveryLines: NoteLineRow[] = [];
  evidence: EvidenceRow[] = [];
  releases: ReleaseDecisionRow[] = [];
  reversals: ReleaseReversalRow[] = [];
  coordinationDecisions: CoordinationDecisionRow[] = [];
  workItems: WorkItemRow[] = [];
  attention: AttentionRow[] = [];

  private record(method: string, predicate: TenantPredicate & Record<string, unknown>): string {
    requireOrg(predicate);
    this.calls.push({ method, predicate });
    return predicate.organizationId;
  }

  async listWarehouseExits(predicate: TenantPredicate & { id?: string; orderId?: string }) {
    const organizationId = this.record('listWarehouseExits', predicate);
    return sameOrg(organizationId, this.warehouseExits).filter((row) => {
      if (predicate.id && row.id !== predicate.id) return false;
      if (predicate.orderId && row.orderId !== predicate.orderId) return false;
      return true;
    });
  }

  async listOutboundNotes(predicate: TenantPredicate & { orderId?: string; warehouseExitId?: string }) {
    const organizationId = this.record('listOutboundNotes', predicate);
    return sameOrg(organizationId, this.outboundNotes).filter((row) => {
      if (predicate.orderId && row.orderId !== predicate.orderId) return false;
      if (predicate.warehouseExitId && row.warehouseExitId !== predicate.warehouseExitId) return false;
      return true;
    });
  }

  async listOutboundNoteLines(predicate: TenantPredicate & { outboundNoteIds: readonly string[] }) {
    const organizationId = this.record('listOutboundNoteLines', predicate);
    if (predicate.outboundNoteIds.length === 0) return [];
    const ids = new Set(predicate.outboundNoteIds);
    return sameOrg(organizationId, this.outboundLines).filter((row) => ids.has(row.noteId));
  }

  async listDeliveries(predicate: TenantPredicate & { id?: string; orderId?: string }) {
    const organizationId = this.record('listDeliveries', predicate);
    return sameOrg(organizationId, this.deliveries).filter((row) => {
      if (predicate.id && row.id !== predicate.id) return false;
      if (predicate.orderId && row.orderId !== predicate.orderId) return false;
      return true;
    });
  }

  async listDeliveryNotes(predicate: TenantPredicate & { orderId?: string; deliveryId?: string }) {
    const organizationId = this.record('listDeliveryNotes', predicate);
    return sameOrg(organizationId, this.deliveryNotes).filter((row) => {
      if (predicate.orderId && row.orderId !== predicate.orderId) return false;
      if (predicate.deliveryId && row.deliveryId !== predicate.deliveryId) return false;
      return true;
    });
  }

  async listDeliveryNoteLines(predicate: TenantPredicate & { deliveryNoteIds: readonly string[] }) {
    const organizationId = this.record('listDeliveryNoteLines', predicate);
    if (predicate.deliveryNoteIds.length === 0) return [];
    const ids = new Set(predicate.deliveryNoteIds);
    return sameOrg(organizationId, this.deliveryLines).filter((row) => ids.has(row.noteId));
  }

  async listEvidence(predicate: TenantPredicate & { subjectType: string; subjectIds: readonly string[] }) {
    const organizationId = this.record('listEvidence', predicate);
    if (predicate.subjectIds.length === 0) return [];
    const ids = new Set(predicate.subjectIds);
    return sameOrg(organizationId, this.evidence).filter(
      (row) => row.subjectType === predicate.subjectType && ids.has(row.subjectId),
    );
  }

  async listReleaseDecisions(predicate: TenantPredicate & { id?: string; orderId?: string; caseId?: string }) {
    const organizationId = this.record('listReleaseDecisions', predicate);
    return sameOrg(organizationId, this.releases).filter((row) => {
      if (predicate.id && row.id !== predicate.id) return false;
      if (predicate.orderId && row.orderId !== predicate.orderId) return false;
      if (predicate.caseId && row.caseId !== predicate.caseId) return false;
      return true;
    });
  }

  async listReleaseReversals(predicate: TenantPredicate & { decisionIds: readonly string[] }) {
    const organizationId = this.record('listReleaseReversals', predicate);
    if (predicate.decisionIds.length === 0) return [];
    const ids = new Set(predicate.decisionIds);
    return sameOrg(organizationId, this.reversals).filter((row) => ids.has(row.decisionId));
  }

  async listCoordinationDecisions(predicate: TenantPredicate & { id?: string }) {
    this.record('listCoordinationDecisions', predicate);
    throw new Error('CROSS_LANE_CHANGE_REQUEST');
  }

  async listWorkItems(predicate: TenantPredicate & { status?: string; subjectTypes?: readonly string[] }) {
    const organizationId = this.record('listWorkItems', predicate);
    const subjects = predicate.subjectTypes ? new Set(predicate.subjectTypes) : null;
    return sameOrg(organizationId, this.workItems).filter((row) => {
      if (predicate.status && row.status !== predicate.status) return false;
      if (subjects && (row.subjectType === null || !subjects.has(row.subjectType))) return false;
      return true;
    });
  }

  async listAttention(predicate: TenantPredicate & { isActive?: boolean; subjectTypes?: readonly string[] }) {
    const organizationId = this.record('listAttention', predicate);
    const subjects = predicate.subjectTypes ? new Set(predicate.subjectTypes) : null;
    return sameOrg(organizationId, this.attention).filter((row) => {
      if (predicate.isActive !== undefined && row.isActive !== predicate.isActive) return false;
      if (subjects && (row.subjectType === null || !subjects.has(row.subjectType))) return false;
      return true;
    });
  }
}
