import {
  COMMERCIAL_WORK_SUBJECT_TYPES,
  COMPANY_READ_SCOPE,
  COORDINATION_DECISION_READ_CHANGE_REQUEST,
  CROSS_LANE_CHANGE_REQUEST,
  holdsCommercialWorkRead,
  holdsCompanyRead,
} from './capabilities';
import type {
  AttentionRow,
  DeliveryNoteRow,
  DeliveryRow,
  EvidenceRow,
  FulfillmentReadDbPort,
  NoteLineRow,
  OutboundNoteRow,
  ReleaseDecisionRow,
  ReleaseReversalRow,
  WarehouseExitRow,
  WorkItemRow,
} from './db-port';
import { available, errorRead, noFact, type ErrorRead, type ReadResult } from './source-state';
import { optionalId, trustedOrganization, type ClientReadFields, type TrustedReadContext } from './trusted-context';

const NOTE_NUMBER: null = null;
const REMAINING_QUANTITY: null = null;
const FULFILLMENT_STATUS: null = null;

export type QuantityLineRead = {
  id: string;
  orderLineId: string;
  productRef: string | null;
  description: string;
  quantity: number;
  remainingQuantity: null;
  fulfillmentStatus: null;
  unitLabel: string | null;
};

export type EvidenceRead = {
  id: string;
  role: string;
  recordedByMemberId: string;
  reference: string | null;
  note: string | null;
  paymentState: string | null;
  exceptionReason: string | null;
  authorizedByMemberId: string | null;
  recipient: string | null;
  signatureReference: string | null;
  /** Stored confirmation flags are not copied. Evidence is not ledger truth. */
  confirmedLedgerPayment: false;
  ledgerPosting: null;
  ledgerTruth: false;
};

export type OutboundNoteRead = {
  id: string;
  documentKind: string;
  numberingPolicy: string | null;
  noteNumber: null;
  warehouseExitId: string;
  orderId: string;
  exitedAt: string;
  bornAt: string;
  deliveryNoteId: null;
  lines: QuantityLineRead[];
};

export type WarehouseExitRead = {
  id: string;
  organizationId: string;
  orderId: string;
  exitedAt: string;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  outboundNote: OutboundNoteRead | null;
  evidence: EvidenceRead[];
  customerDeliveryId: null;
  deliveryNoteId: null;
};

export type ChronologyViolation = {
  sourceState: 'ERROR';
  code: 'NOTE_PREDATES_DELIVERY' | 'NOTE_PREDATES_EXIT';
  noteId: string;
  bornAt: string;
  eventAt: string;
};

export type DeliveryNoteRead = {
  id: string;
  documentKind: string;
  numberingPolicy: string | null;
  noteNumber: null;
  deliveryId: string;
  orderId: string;
  deliveredAt: string;
  bornAt: string;
  warehouseExitId: null;
  claimsInvoice: false;
  claimsTax: false;
  lines: QuantityLineRead[];
};

export type StoredPartialQuantity = {
  orderLineId: string;
  recordedQuantities: number[];
  remainingQuantity: null;
};

export type DeliveryRead = {
  id: string;
  organizationId: string;
  orderId: string;
  deliveredAt: string;
  deliveredTo: string | null;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  deliveryNote: DeliveryNoteRead | null;
  evidence: EvidenceRead[];
  warehouseExitId: null;
  outboundNoteId: null;
};

export type DeliveryListRead = {
  sourceState: 'AVAILABLE';
  code: null;
  count: number;
  rows: DeliveryRead[];
  /** Only lines with more than one stored quantity. Empty is not a completeness claim. */
  storedPartialQuantities: StoredPartialQuantity[];
};

export type ChronologyErrorRead = {
  sourceState: 'ERROR';
  code: 'NOTE_PREDATES_DELIVERY' | 'NOTE_PREDATES_EXIT';
  violations: ChronologyViolation[];
};

export type ReleaseRead = {
  id: string;
  organizationId: string;
  caseId: string;
  orderId: string;
  state: string;
  reason: string;
  authorizedByMemberId: string | null;
  authorizedByLabel: string | null;
  source: string;
  timestamp: string;
  recordedAt: string;
  evidence: { text: string | null; reference: string | null };
  basis: string;
  ledgerTruth: false;
  reversal: {
    id: string;
    reason: string;
    authorizedByMemberId: string | null;
    authorizedByLabel: string | null;
    recordedAt: string;
  } | null;
};

export type WorkItemRead = {
  id: string;
  organizationId: string;
  title: string;
  status: string;
  ownerMemberId: string;
  subjectType: string | null;
  subjectId: string | null;
  dueAt: string | null;
};

export type AttentionRead = {
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
};

export type WorkNextActionValue = {
  scope: typeof COMPANY_READ_SCOPE | 'commercial.team.read';
  tenantPredicate: { organizationId: string; subjectTypes?: readonly string[] };
  openWork: WorkItemRead[];
  attention: AttentionRead[];
  nextAction:
    | { sourceState: 'AVAILABLE'; workItemId: string }
    | { sourceState: 'NO_FACT' }
    | { sourceState: 'UNPROVEN'; code: 'COMMERCIAL_SUBJECT_COVERAGE_INCOMPLETE' };
  /**
   * Company read covers the open queue. commercial.team.read only proves
   * commercial_account rows, so an empty result is not "no next action."
   */
  queueCoverage: 'COMPLETE' | 'UNPROVEN';
};

export type CoordinationDenied = {
  sourceState: 'UNPROVEN';
  code: typeof CROSS_LANE_CHANGE_REQUEST;
  changeRequest: typeof COORDINATION_DECISION_READ_CHANGE_REQUEST;
};

function iso(value: Date): string {
  return value.toISOString();
}

function predates(bornAt: Date, eventAt: Date): boolean {
  return bornAt.getTime() < eventAt.getTime();
}

function toLine(row: NoteLineRow): QuantityLineRead {
  return {
    id: row.id,
    orderLineId: row.orderLineId,
    productRef: row.productRef,
    description: row.description,
    quantity: row.quantity,
    remainingQuantity: REMAINING_QUANTITY,
    fulfillmentStatus: FULFILLMENT_STATUS,
    unitLabel: row.unitLabel,
  };
}

function toEvidence(row: EvidenceRow): EvidenceRead {
  return {
    id: row.id,
    role: row.role,
    recordedByMemberId: row.recordedByMemberId,
    reference: row.reference,
    note: row.note,
    paymentState: row.paymentState,
    exceptionReason: row.exceptionReason,
    authorizedByMemberId: row.authorizedByMemberId,
    recipient: row.recipient,
    signatureReference: row.signatureReference,
    confirmedLedgerPayment: false,
    ledgerPosting: null,
    ledgerTruth: false,
  };
}

function denyCompany(ctx: TrustedReadContext): ErrorRead | { organizationId: string } {
  const org = trustedOrganization(ctx);
  if (!org.ok) return errorRead(org.code);
  if (!holdsCompanyRead(ctx.grantedScopes)) return errorRead('PERMISSION_DENIED');
  return org;
}

/**
 * Tenant-scoped fulfillment readers.
 * Client organizationId is not read. Foreign ids are queried with the
 * trusted organization and look like missing facts.
 */
export class FulfillmentReadService {
  constructor(private readonly db: FulfillmentReadDbPort) {}

  async readWarehouseExits(
    ctx: TrustedReadContext,
    request: ClientReadFields = {},
  ): Promise<ReadResult<WarehouseExitRead> | ChronologyErrorRead> {
    const gate = denyCompany(ctx);
    if (!('organizationId' in gate)) return gate;
    const organizationId = gate.organizationId;
    try {
      const exits = await this.db.listWarehouseExits({
        organizationId,
        id: optionalId(request.id),
        orderId: optionalId(request.orderId),
      });
      if (optionalId(request.id) && exits.length === 0) return noFact();
      const notes = await this.db.listOutboundNotes({
        organizationId,
        orderId: optionalId(request.orderId),
        warehouseExitId: optionalId(request.id),
      });
      const lines = await this.db.listOutboundNoteLines({
        organizationId,
        outboundNoteIds: notes.map((note) => note.id),
      });
      const evidence = await this.db.listEvidence({
        organizationId,
        subjectType: 'warehouse_exit',
        subjectIds: exits.map((row) => row.id),
      });
      const built = buildWarehouseExits(organizationId, exits, notes, lines, evidence);
      if (built.violations.length > 0) {
        return { sourceState: 'ERROR', code: 'NOTE_PREDATES_EXIT', violations: built.violations };
      }
      return available(built.rows);
    } catch (err) {
      return errorRead(err instanceof Error ? err.message : 'INTERNAL_ERROR');
    }
  }

  async readDeliveries(
    ctx: TrustedReadContext,
    request: ClientReadFields = {},
  ): Promise<DeliveryListRead | ChronologyErrorRead | Exclude<ReadResult<DeliveryRead>, { sourceState: 'AVAILABLE' }>> {
    const gate = denyCompany(ctx);
    if (!('organizationId' in gate)) return gate;
    const organizationId = gate.organizationId;
    try {
      const deliveries = await this.db.listDeliveries({
        organizationId,
        id: optionalId(request.id),
        orderId: optionalId(request.orderId),
      });
      if (optionalId(request.id) && deliveries.length === 0) return noFact();
      const notes = await this.db.listDeliveryNotes({
        organizationId,
        orderId: optionalId(request.orderId),
        deliveryId: optionalId(request.id),
      });
      const lines = await this.db.listDeliveryNoteLines({
        organizationId,
        deliveryNoteIds: notes.map((note) => note.id),
      });
      const evidence = await this.db.listEvidence({
        organizationId,
        subjectType: 'delivery',
        subjectIds: deliveries.map((row) => row.id),
      });
      const built = buildDeliveries(organizationId, deliveries, notes, lines, evidence);
      if (built.violations.length > 0) {
        return { sourceState: 'ERROR', code: 'NOTE_PREDATES_DELIVERY', violations: built.violations };
      }
      return {
        sourceState: 'AVAILABLE',
        code: null,
        count: built.deliveries.length,
        rows: built.deliveries,
        storedPartialQuantities: built.storedPartialQuantities,
      };
    } catch (err) {
      return errorRead(err instanceof Error ? err.message : 'INTERNAL_ERROR');
    }
  }

  async readOperationalReleases(
    ctx: TrustedReadContext,
    request: ClientReadFields = {},
  ): Promise<ReadResult<ReleaseRead>> {
    const gate = denyCompany(ctx);
    if (!('organizationId' in gate)) return gate;
    const organizationId = gate.organizationId;
    try {
      const decisions = await this.db.listReleaseDecisions({
        organizationId,
        id: optionalId(request.id),
        orderId: optionalId(request.orderId),
        caseId: optionalId(request.caseId),
      });
      if (optionalId(request.id) && decisions.length === 0) return noFact();
      const reversals = await this.db.listReleaseReversals({
        organizationId,
        decisionIds: decisions.map((row) => row.id),
      });
      return available(decisions.map((decision) => toRelease(decision, reversals)));
    } catch (err) {
      return errorRead(err instanceof Error ? err.message : 'INTERNAL_ERROR');
    }
  }

  /**
   * Tenant-scoped coordination query exists on the db port. This reader
   * denies until a dedicated read capability exists. Write scopes do not
   * unlock it. The result is UNPROVEN and has no count.
   */
  async readCoordinationDecisions(
    ctx: TrustedReadContext,
    _request: ClientReadFields = {},
  ): Promise<CoordinationDenied | ReadResult<never>> {
    const org = trustedOrganization(ctx);
    if (!org.ok) return errorRead(org.code);
    return {
      sourceState: 'UNPROVEN',
      code: CROSS_LANE_CHANGE_REQUEST,
      changeRequest: COORDINATION_DECISION_READ_CHANGE_REQUEST,
    };
  }

  /**
   * Queries OsWorkItem and OsAttentionReadModel by organizationId.
   * management.org.read reads the org queue.
   * commercial.team.read reads only rows whose subjectType is a proven
   * commercial subject, and that predicate is part of the query.
   * It does not unlock the org-wide queue. people.admin is not a shortcut.
   */
  async readWorkNextAction(
    ctx: TrustedReadContext,
    _request: ClientReadFields = {},
  ): Promise<ReadResult<WorkNextActionValue>> {
    const org = trustedOrganization(ctx);
    if (!org.ok) return errorRead(org.code);
    const company = holdsCompanyRead(ctx.grantedScopes);
    const commercial = holdsCommercialWorkRead(ctx.grantedScopes);
    if (!company && !commercial) return errorRead('PERMISSION_DENIED');

    const subjectTypes = company ? undefined : [...COMMERCIAL_WORK_SUBJECT_TYPES];
    const predicate = {
      organizationId: org.organizationId,
      ...(subjectTypes ? { subjectTypes } : {}),
    };
    try {
      const work = await this.db.listWorkItems({ ...predicate, status: 'open' });
      const attention = await this.db.listAttention({ ...predicate, isActive: true });
      const openWork = work.map(toWork);
      return available([
        {
          scope: company ? COMPANY_READ_SCOPE : 'commercial.team.read',
          tenantPredicate: predicate,
          openWork,
          attention: attention.map(toAttention),
          nextAction: company ? nextStoredAction(openWork) : commercialNextAction(openWork),
          queueCoverage: company ? 'COMPLETE' : 'UNPROVEN',
        },
      ]);
    } catch (err) {
      return errorRead(err instanceof Error ? err.message : 'INTERNAL_ERROR');
    }
  }
}

function buildWarehouseExits(
  organizationId: string,
  exits: WarehouseExitRow[],
  notes: OutboundNoteRow[],
  lines: NoteLineRow[],
  evidence: EvidenceRow[],
): { rows: WarehouseExitRead[]; violations: ChronologyViolation[] } {
  const violations: ChronologyViolation[] = [];
  const rows = exits
    .filter((row) => row.organizationId === organizationId)
    .map((exit) => {
      const note = notes.find(
        (item) => item.organizationId === organizationId && item.warehouseExitId === exit.id,
      );
      let outboundNote: OutboundNoteRead | null = null;
      if (note) {
        if (predates(note.bornAt, exit.exitedAt) || predates(note.bornAt, note.exitedAt)) {
          violations.push({
            sourceState: 'ERROR',
            code: 'NOTE_PREDATES_EXIT',
            noteId: note.id,
            bornAt: iso(note.bornAt),
            eventAt: iso(exit.exitedAt),
          });
        } else {
          outboundNote = {
            id: note.id,
            documentKind: note.documentKind,
            numberingPolicy: note.numberingPolicy,
            noteNumber: NOTE_NUMBER,
            warehouseExitId: note.warehouseExitId,
            orderId: note.orderId,
            exitedAt: iso(note.exitedAt),
            bornAt: iso(note.bornAt),
            deliveryNoteId: null,
            lines: lines
              .filter((line) => line.organizationId === organizationId && line.noteId === note.id)
              .map(toLine),
          };
        }
      }
      return {
        id: exit.id,
        organizationId,
        orderId: exit.orderId,
        exitedAt: iso(exit.exitedAt),
        recordedByMemberId: exit.recordedByMemberId,
        source: exit.source,
        notes: exit.notes,
        outboundNote,
        evidence: evidence
          .filter((item) => item.organizationId === organizationId && item.subjectId === exit.id)
          .map(toEvidence),
        customerDeliveryId: null,
        deliveryNoteId: null,
      } satisfies WarehouseExitRead;
    });
  return { rows, violations };
}

function buildDeliveries(
  organizationId: string,
  deliveries: DeliveryRow[],
  notes: DeliveryNoteRow[],
  lines: NoteLineRow[],
  evidence: EvidenceRow[],
): { deliveries: DeliveryRead[]; storedPartialQuantities: StoredPartialQuantity[]; violations: ChronologyViolation[] } {
  const violations: ChronologyViolation[] = [];
  const acceptedNotes: DeliveryNoteRead[] = [];
  const mapped = deliveries
    .filter((row) => row.organizationId === organizationId)
    .map((delivery) => {
      const note = notes.find((item) => item.organizationId === organizationId && item.deliveryId === delivery.id);
      let deliveryNote: DeliveryNoteRead | null = null;
      if (note) {
        const eventAt = delivery.deliveredAt;
        if (predates(note.bornAt, eventAt) || predates(note.bornAt, note.deliveredAt) || predates(note.deliveredAt, eventAt)) {
          violations.push({
            sourceState: 'ERROR',
            code: 'NOTE_PREDATES_DELIVERY',
            noteId: note.id,
            bornAt: iso(note.bornAt),
            eventAt: iso(eventAt),
          });
        } else {
          deliveryNote = {
            id: note.id,
            documentKind: note.documentKind,
            numberingPolicy: note.numberingPolicy,
            noteNumber: NOTE_NUMBER,
            deliveryId: note.deliveryId,
            orderId: note.orderId,
            deliveredAt: iso(note.deliveredAt),
            bornAt: iso(note.bornAt),
            warehouseExitId: null,
            claimsInvoice: false,
            claimsTax: false,
            lines: lines
              .filter((line) => line.organizationId === organizationId && line.noteId === note.id)
              .map(toLine),
          };
          acceptedNotes.push(deliveryNote);
        }
      }
      return {
        id: delivery.id,
        organizationId,
        orderId: delivery.orderId,
        deliveredAt: iso(delivery.deliveredAt),
        deliveredTo: delivery.deliveredTo,
        recordedByMemberId: delivery.recordedByMemberId,
        source: delivery.source,
        notes: delivery.notes,
        deliveryNote,
        evidence: evidence
          .filter((item) => item.organizationId === organizationId && item.subjectId === delivery.id)
          .map(toEvidence),
        warehouseExitId: null,
        outboundNoteId: null,
      } satisfies DeliveryRead;
    });

  return {
    deliveries: mapped,
    storedPartialQuantities: partialFromStoredQuantities(acceptedNotes),
    violations,
  };
}

/**
 * A partial delivery is a fact only when more than one stored quantity exists
 * for the same order line. Remaining quantity is not stored and is not computed.
 */
export function partialFromStoredQuantities(notes: readonly { lines: readonly QuantityLineRead[] }[]): StoredPartialQuantity[] {
  const byLine = new Map<string, number[]>();
  for (const note of notes) {
    for (const line of note.lines) {
      const current = byLine.get(line.orderLineId) ?? [];
      current.push(line.quantity);
      byLine.set(line.orderLineId, current);
    }
  }
  const facts: StoredPartialQuantity[] = [];
  for (const [orderLineId, recordedQuantities] of byLine) {
    if (recordedQuantities.length < 2) continue;
    facts.push({ orderLineId, recordedQuantities, remainingQuantity: null });
  }
  return facts;
}

function toRelease(decision: ReleaseDecisionRow, reversals: readonly ReleaseReversalRow[]): ReleaseRead {
  const reversal = reversals.find(
    (row) => row.organizationId === decision.organizationId && row.decisionId === decision.id,
  );
  return {
    id: decision.id,
    organizationId: decision.organizationId,
    caseId: decision.caseId,
    orderId: decision.orderId,
    state: decision.state,
    reason: decision.reason,
    authorizedByMemberId: decision.actorMemberId,
    authorizedByLabel: decision.actorLabel,
    source: decision.source,
    timestamp: iso(decision.decidedAt),
    recordedAt: iso(decision.recordedAt),
    evidence: { text: decision.evidenceText, reference: decision.evidenceReference },
    basis: decision.basis,
    ledgerTruth: false,
    reversal: reversal
      ? {
          id: reversal.id,
          reason: reversal.reason,
          authorizedByMemberId: reversal.actorMemberId,
          authorizedByLabel: reversal.actorLabel,
          recordedAt: iso(reversal.recordedAt),
        }
      : null,
  };
}

function toWork(row: WorkItemRow): WorkItemRead {
  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    status: row.status,
    ownerMemberId: row.ownerMemberId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    dueAt: row.dueAt ? iso(row.dueAt) : null,
  };
}

function toAttention(row: AttentionRow): AttentionRead {
  return {
    attentionKey: row.attentionKey,
    organizationId: row.organizationId,
    memberId: row.memberId,
    attentionType: row.attentionType,
    reasonCode: row.reasonCode,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    workItemId: row.workItemId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
  };
}

function commercialNextAction(work: readonly WorkItemRead[]): WorkNextActionValue['nextAction'] {
  const dated = nextStoredAction(work);
  if (dated.sourceState === 'AVAILABLE') return dated;
  return { sourceState: 'UNPROVEN', code: 'COMMERCIAL_SUBJECT_COVERAGE_INCOMPLETE' };
}

function nextStoredAction(work: readonly WorkItemRead[]): WorkNextActionValue['nextAction'] {
  const dated = work.filter((item) => item.dueAt);
  if (dated.length === 0) return { sourceState: 'NO_FACT' };
  const next = [...dated].sort((left, right) => {
    const byDue = (left.dueAt ?? '').localeCompare(right.dueAt ?? '');
    if (byDue !== 0) return byDue;
    return left.id.localeCompare(right.id);
  })[0];
  if (!next) return { sourceState: 'NO_FACT' };
  return { sourceState: 'AVAILABLE', workItemId: next.id };
}

export function coordinationReadIsUnproven(result: CoordinationDenied | ReadResult<never>): result is CoordinationDenied {
  return result.sourceState === 'UNPROVEN' && !('count' in result);
}
