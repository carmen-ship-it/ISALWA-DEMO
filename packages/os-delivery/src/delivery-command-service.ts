import { ZodError } from 'zod';
import {
  CUSTOMER_DELIVERY_NOTE_KIND,
  DELIVERY_CLAIMS_INVOICE,
  DELIVERY_CLAIMS_TAX,
  DELIVERY_NOTE_NUMBER,
  DELIVERY_NOTE_NUMBERING_POLICY,
  DELIVERY_NUMBERING_POLICY,
  PAYMENT_REQUIRED_BEFORE_DELIVERY,
  WAREHOUSE_OUTBOUND_KIND,
  assertCumulativeDispatchWithinOrder,
  assertDeliveryResourceRole,
  assertEventHasOccurred,
  computeDispatchBalance,
  denyForeignRows,
  findOverDispatchedLines,
  parseCorrectDeliveryDocument,
  parseCreateNotaDeEntrega,
  parseRecordCustomerDelivery,
  parseRecordDeliveryEvidence,
  parseRecordEntrega,
  parseRecordSalida,
  provisionalInternalDocumentRef,
  requireSessionOrganization,
  storeDeliveredQuantities,
  suggestRecipientsInTenant,
  summarizeCommittedDispatch,
  visibleInSession,
  type CopiedDeliveryLine,
  type DeliveryCommandName,
  type DeliveryResource,
  type DispatchLedgerName,
  type OrderLineDispatchBalance,
  type OverDispatchedLine,
} from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import type {
  DeliveryDomainEventRecord,
  DeliveryNoteRecord,
  DeliveryRecord,
  DeliveryStore,
  EvidenceRecord,
  NoteLineRecord,
  OrderSnapshot,
  OutboundNoteRecord,
  WarehouseExitRecord,
} from './store-types';

export type DeliveryContext = {
  organizationId?: string | null;
  actorMemberId: string;
  effectiveAt: Date;
};

export type DeliveryAggregate = {
  count: number;
};

export type DeliveryCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

export type NotaDeEntregaResult = {
  deliveryNoteId: string;
  orderId: string;
  partyId: string;
  documentKind: typeof CUSTOMER_DELIVERY_NOTE_KIND;
  numberingPolicy: typeof DELIVERY_NOTE_NUMBERING_POLICY;
  noteNumber: null;
  internalDocumentRef: string;
  displayDocumentNumber: string | null;
  status: 'issued';
  recipient: string;
  deliveredBy: string;
  receivedBy: null;
  claimsInvoice: false;
  claimsTax: false;
  lineCount: number;
};

export type WarehouseExitResult = {
  warehouseExitId: string;
  outboundNoteId: string;
  orderId: string;
  documentKind: typeof WAREHOUSE_OUTBOUND_KIND;
  numberingPolicy: typeof DELIVERY_NUMBERING_POLICY;
  noteNumber: null;
  externalDocumentNumber: string | null;
  deliveryNoteId: string | null;
  customerDeliveryId: null;
  claimsInvoice: false;
  claimsTax: false;
  lineCount: number;
};

export type CustomerDeliveryResult = {
  deliveryId: string;
  deliveryNoteId: string | null;
  orderId: string;
  documentKind: null;
  numberingPolicy: null;
  noteNumber: null;
  externalDocumentNumber: string | null;
  warehouseExitId: null;
  outboundNoteId: null;
  claimsInvoice: false;
  claimsTax: false;
  confirmedLedgerPayment: false;
  paymentRequired: false;
  bornAt: null;
  deliveredAt: string;
  receivedBy: string | null;
  lineCount: number;
};

export type DispatchBalanceResult = {
  orderId: string;
  lines: OrderLineDispatchBalance[];
};

export type OverDeliveredOrderReport = {
  orderId: string;
  orderNumber: string | null;
  lines: OverDispatchedLine[];
};

export type CorrectDeliveryDocumentResult = {
  originalNoteId: string;
  reversalNoteId: string;
  status: 'reversed';
  reason: string;
};

function assertTenantMatch(sessionOrgId: string, resourceOrgId: string): void {
  if (sessionOrgId !== resourceOrgId) throw new Error('TENANT_FORBIDDEN');
}

function assertMemberActive(accessStatus: string): void {
  if (accessStatus === 'revoked' || accessStatus === 'suspended') throw new Error('ACCESS_REVOKED');
  if (accessStatus === 'invited') throw new Error('AUTH_REQUIRED');
}

function asError(err: unknown): Error {
  if (err instanceof ZodError) return new Error('VALIDATION_FAILED');
  if (err instanceof Error) return err;
  return new Error('VALIDATION_FAILED');
}

/**
 * Memory inserts are not a database writer. Live persistence for the memory path
 * stays UNPROVEN. Hosted warehouse exit and customer delivery use the separate
 * database-backed delivery store port (migrations unapplied until Control Tower).
 */
export const DELIVERY_LIVE_WRITE = 'UNPROVEN' as const;

function isDeliveryIdempotencyConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  if (code === 'P2002') return true;
  const message = err instanceof Error ? err.message : '';
  return message === 'IDEMPOTENCY_CONFLICT' || /Unique constraint/i.test(message);
}

export class DeliveryCommandService {
  /**
   * `inTransaction` is internal: true only for the instance bound to a transaction store
   * (see atomically). Callers construct the service with the store alone.
   */
  constructor(
    private readonly store: DeliveryStore,
    private readonly inTransaction: boolean = false,
  ) {}

  /**
   * Run a command body as one all-or-nothing unit on the store. Inside an existing unit it
   * simply joins it, so execute() can wrap dispatch + idempotency completion together
   * while each public command stays atomic when called directly.
   */
  private async atomically<T>(fn: (service: DeliveryCommandService) => Promise<T>): Promise<T> {
    if (this.inTransaction) return fn(this);
    return this.store.runInTransaction((tx) => fn(new DeliveryCommandService(tx, true)));
  }

  async execute(
    command: DeliveryCommandName,
    ctx: DeliveryContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<DeliveryCommandResult> {
    const key = idempotencyKey?.trim() || undefined;
    const organizationId = ctx.organizationId?.trim() || '';
    if (key) {
      if (!organizationId) throw new Error('TENANT_FORBIDDEN');
      const replay = await this.readReplay(organizationId, key);
      if (replay) return replay;
      try {
        await this.store.saveIdempotency({
          organizationId,
          key,
          commandName: command,
          resultJson: { pending: true },
          expiresAt: new Date(Date.now() + 86400_000),
        });
      } catch (err) {
        if (!isDeliveryIdempotencyConflict(err)) throw err;
        const winner = await this.readReplay(organizationId, key);
        if (winner) return winner;
        throw new Error('CONFLICT');
      }
    }

    // True once the transactional unit has returned and is committing. An error after that
    // point has an unknown outcome, so the claim is kept (a retry gets CONFLICT, never a
    // duplicate write). An error before it means the unit rolled back, so the claim is
    // released and the same key can be retried safely.
    let committing = false;
    try {
      return await this.atomically(async (service) => {
        const result = await service.dispatch(command, ctx, payload);
        if (key) {
          await service.store.completeIdempotency(
            organizationId,
            key,
            result as unknown as Record<string, unknown>,
          );
        }
        committing = true;
        return result;
      });
    } catch (err) {
      if (key && !committing && organizationId) {
        await this.store.deleteIdempotency(organizationId, key).catch(() => undefined);
      }
      throw err;
    }
  }

  private async readReplay(organizationId: string, key: string): Promise<DeliveryCommandResult | null> {
    const row = await this.store.findIdempotency(organizationId, key);
    const json = row?.resultJson;
    if (!json || json.pending === true || !json.data || typeof json.data !== 'object') return null;
    return json as unknown as DeliveryCommandResult;
  }

  private async dispatch(
    command: DeliveryCommandName,
    ctx: DeliveryContext,
    payload: Record<string, unknown>,
  ): Promise<DeliveryCommandResult> {
    const commandId = createId();
    const correlationId = createId();
    let data: Record<string, unknown>;
    switch (command) {
      case 'CreateNotaDeEntrega':
        data = { ...(await this.createNotaDeEntrega(ctx, payload)) };
        break;
      case 'RecordSalida':
      case 'RecordWarehouseExit':
        data = { ...(await this.recordSalida(ctx, payload)) };
        break;
      case 'RecordEntrega':
        data = { ...(await this.recordEntrega(ctx, payload)) };
        break;
      case 'RecordCustomerDelivery':
        data = { ...(await this.recordCustomerDelivery(ctx, payload)) };
        break;
      case 'CorrectDeliveryDocument':
        data = { ...(await this.correctDeliveryDocument(ctx, payload)) };
        break;
      case 'RecordDeliveryEvidence':
        data = { ...(await this.recordEvidence(ctx, payload)) };
        break;
      default: {
        const _exhaustive: never = command;
        throw new Error(`VALIDATION_FAILED:${_exhaustive}`);
      }
    }
    return { commandId, correlationId, data };
  }

  /** Prefer CreateNotaDeEntrega — this refuses silent auto-create. */
  createNoteBeforeDelivery(): never {
    throw new Error('USE_CREATE_NOTA_DE_ENTREGA');
  }

  async createNotaDeEntrega(ctx: DeliveryContext, payload: unknown): Promise<NotaDeEntregaResult> {
    return this.atomically((service) => service.createNotaDeEntregaUnit(ctx, payload));
  }

  private async createNotaDeEntregaUnit(ctx: DeliveryContext, payload: unknown): Promise<NotaDeEntregaResult> {
    try {
      const parsed = parseCreateNotaDeEntrega(payload);
      await this.authorize(ctx, parsed.recordedBy, 'delivery_note');
      const organizationId = requireSessionOrganization(ctx.organizationId);
      // Lock first, then read: the order and the ledger below must reflect every committed
      // concurrent dispatch (ADR 0003: enforced atomically, including concurrent requests).
      await this.store.lockOrderForUpdate(organizationId, parsed.orderId);
      const order = await this.requireOpenOrder(organizationId, parsed.orderId);
      const lines = storeDeliveredQuantities(order.lines, parsed.quantities);
      await this.assertWithinCumulativeDispatch(organizationId, order, 'delivery_note', lines);
      const now = ctx.effectiveAt.toISOString();
      const noteId = createId();
      const internalDocumentRef = provisionalInternalDocumentRef(noteId);
      const note: DeliveryNoteRecord = {
        id: noteId,
        organizationId,
        deliveryId: null,
        orderId: parsed.orderId,
        partyId: order.partyId,
        documentKind: CUSTOMER_DELIVERY_NOTE_KIND,
        numberingPolicy: DELIVERY_NOTE_NUMBERING_POLICY,
        noteNumber: DELIVERY_NOTE_NUMBER,
        internalDocumentRef,
        displayDocumentNumber: parsed.displayDocumentNumber,
        externalDocumentNumber: null,
        status: 'issued',
        recipient: parsed.recipient,
        deliveredBy: parsed.deliveredBy,
        receivedBy: null,
        observations: parsed.observations,
        locationId: parsed.locationId,
        createdByMemberId: parsed.recordedBy,
        correctsNoteId: null,
        supersedesNoteId: null,
        correctionReason: null,
        deliveredAt: null,
        bornAt: now,
        claimsInvoice: DELIVERY_CLAIMS_INVOICE,
        claimsTax: DELIVERY_CLAIMS_TAX,
        createdAt: now,
      };
      await this.store.insertDeliveryNote(note);
      await this.store.insertDeliveryNoteLines(lines.map((line) => this.lineRow(organizationId, note.id, line)));
      await this.emit(organizationId, order.partyId, parsed.orderId, parsed.recordedBy, now, {
        eventType: 'delivery_note.created',
        primaryEntityId: note.id,
        payload: {
          deliveryNoteId: note.id,
          orderId: parsed.orderId,
          partyId: order.partyId,
          internalDocumentRef,
          numberingPolicy: DELIVERY_NOTE_NUMBERING_POLICY,
          recipient: parsed.recipient,
          deliveredBy: parsed.deliveredBy,
        },
      });
      return {
        deliveryNoteId: note.id,
        orderId: parsed.orderId,
        partyId: order.partyId,
        documentKind: CUSTOMER_DELIVERY_NOTE_KIND,
        numberingPolicy: DELIVERY_NOTE_NUMBERING_POLICY,
        noteNumber: null,
        internalDocumentRef,
        displayDocumentNumber: parsed.displayDocumentNumber,
        status: 'issued',
        recipient: parsed.recipient,
        deliveredBy: parsed.deliveredBy,
        receivedBy: null,
        claimsInvoice: false,
        claimsTax: false,
        lineCount: lines.length,
      };
    } catch (err) {
      throw asError(err);
    }
  }

  async recordSalida(ctx: DeliveryContext, payload: unknown): Promise<WarehouseExitResult> {
    return this.atomically((service) => service.recordSalidaUnit(ctx, payload));
  }

  private async recordSalidaUnit(ctx: DeliveryContext, payload: unknown): Promise<WarehouseExitResult> {
    try {
      const parsed = parseRecordSalida(payload);
      await this.authorize(ctx, parsed.recordedBy, 'warehouse_exit');
      if (Date.parse(parsed.exitedAt) > ctx.effectiveAt.getTime()) throw new Error('VALIDATION_FAILED');
      const organizationId = requireSessionOrganization(ctx.organizationId);
      await this.store.lockOrderForUpdate(organizationId, parsed.orderId);
      const order = await this.requireOpenOrder(organizationId, parsed.orderId);
      const lines = storeDeliveredQuantities(order.lines, parsed.quantities);
      if (parsed.deliveryNoteId) {
        const linked = visibleInSession(
          organizationId,
          await this.store.getDeliveryNoteById(organizationId, parsed.deliveryNoteId),
        );
        if (!linked || linked.orderId !== parsed.orderId || linked.status !== 'issued') {
          throw new Error('NOT_FOUND');
        }
      }
      await this.assertWithinCumulativeDispatch(organizationId, order, 'warehouse_exit', lines);
      const now = ctx.effectiveAt.toISOString();
      const exit: WarehouseExitRecord = {
        id: createId(),
        organizationId,
        orderId: parsed.orderId,
        deliveryNoteId: parsed.deliveryNoteId,
        exitedAt: parsed.exitedAt,
        recordedByMemberId: parsed.recordedBy,
        source: parsed.source,
        notes: parsed.notes,
        createdAt: now,
      };
      const note: OutboundNoteRecord = {
        id: createId(),
        organizationId,
        warehouseExitId: exit.id,
        orderId: parsed.orderId,
        documentKind: WAREHOUSE_OUTBOUND_KIND,
        numberingPolicy: DELIVERY_NUMBERING_POLICY,
        noteNumber: DELIVERY_NOTE_NUMBER,
        externalDocumentNumber: parsed.externalDocumentNumber,
        exitedAt: parsed.exitedAt,
        bornAt: parsed.exitedAt,
        createdAt: now,
      };
      await this.store.insertWarehouseExit(exit);
      await this.store.insertOutboundNote(note);
      await this.store.insertOutboundLines(lines.map((line) => this.lineRow(organizationId, note.id, line)));
      await this.emit(organizationId, order.partyId, parsed.orderId, parsed.recordedBy, parsed.exitedAt, {
        eventType: 'warehouse_exit.recorded',
        primaryEntityId: exit.id,
        payload: {
          warehouseExitId: exit.id,
          orderId: parsed.orderId,
          partyId: order.partyId,
          deliveryNoteId: parsed.deliveryNoteId,
        },
      });
      return {
        warehouseExitId: exit.id,
        outboundNoteId: note.id,
        orderId: parsed.orderId,
        documentKind: WAREHOUSE_OUTBOUND_KIND,
        numberingPolicy: DELIVERY_NUMBERING_POLICY,
        noteNumber: null,
        externalDocumentNumber: parsed.externalDocumentNumber,
        deliveryNoteId: parsed.deliveryNoteId,
        customerDeliveryId: null,
        claimsInvoice: false,
        claimsTax: false,
        lineCount: lines.length,
      };
    } catch (err) {
      throw asError(err);
    }
  }

  /** Alias kept for registry compatibility. */
  async recordWarehouseExit(ctx: DeliveryContext, payload: unknown): Promise<WarehouseExitResult> {
    return this.recordSalida(ctx, payload);
  }

  async recordEntrega(ctx: DeliveryContext, payload: unknown): Promise<CustomerDeliveryResult> {
    return this.atomically((service) => service.recordEntregaUnit(ctx, payload));
  }

  /**
   * Receipt stores no quantity lines and is not checked against the dispatch ledger, so it
   * never counts a dispatch again (ADR 0003). It still takes the order lock because it
   * rewrites the linked note row and must not interleave with a correction of that note.
   */
  private async recordEntregaUnit(ctx: DeliveryContext, payload: unknown): Promise<CustomerDeliveryResult> {
    try {
      const parsed = parseRecordEntrega(payload);
      await this.authorize(ctx, parsed.recordedBy, 'delivery');
      assertEventHasOccurred(parsed.deliveredAt, ctx.effectiveAt);
      const organizationId = requireSessionOrganization(ctx.organizationId);
      await this.store.lockOrderForUpdate(organizationId, parsed.orderId);
      const order = await this.requireOpenOrder(organizationId, parsed.orderId);
      const exits = denyForeignRows(
        organizationId,
        await this.store.listWarehouseExits(organizationId, parsed.orderId),
      );
      if (exits.length === 0) throw new Error('VALIDATION_FAILED');
      const lines = storeDeliveredQuantities(order.lines, parsed.quantities);
      let linkedNote: DeliveryNoteRecord | null = null;
      if (parsed.deliveryNoteId) {
        linkedNote = visibleInSession(
          organizationId,
          await this.store.getDeliveryNoteById(organizationId, parsed.deliveryNoteId),
        );
        if (!linkedNote || linkedNote.orderId !== parsed.orderId || linkedNote.status !== 'issued') {
          throw new Error('NOT_FOUND');
        }
      }
      const now = ctx.effectiveAt.toISOString();
      const delivery: DeliveryRecord = {
        id: createId(),
        organizationId,
        orderId: parsed.orderId,
        deliveryNoteId: parsed.deliveryNoteId,
        deliveredAt: parsed.deliveredAt,
        deliveredTo: parsed.receivedBy,
        recordedByMemberId: parsed.recordedBy,
        source: parsed.source,
        notes: parsed.notes,
        createdAt: now,
      };
      await this.store.insertDelivery(delivery);
      if (linkedNote) {
        const updated: DeliveryNoteRecord = {
          ...linkedNote,
          deliveryId: linkedNote.deliveryId ?? delivery.id,
          deliveredAt: linkedNote.deliveredAt ?? parsed.deliveredAt,
          receivedBy: parsed.receivedBy,
        };
        await this.store.updateDeliveryNote(updated);
      }
      if (parsed.evidenceReference) {
        await this.store.insertEvidence({
          id: createId(),
          organizationId,
          subjectType: 'delivery',
          subjectId: delivery.id,
          role: 'delivery_confirmation',
          recordedByMemberId: parsed.recordedBy,
          reference: parsed.evidenceReference,
          note: parsed.notes,
          paymentState: null,
          exceptionReason: null,
          authorizedByMemberId: null,
          recipient: parsed.receivedBy,
          signatureReference: parsed.evidenceReference,
          confirmedLedgerPayment: false,
          ledgerPosting: 'none',
          signatureMethod: null,
          createdAt: now,
        });
      }
      await this.emit(organizationId, order.partyId, parsed.orderId, parsed.recordedBy, parsed.deliveredAt, {
        eventType: 'customer_delivery.recorded',
        primaryEntityId: delivery.id,
        payload: {
          deliveryId: delivery.id,
          orderId: parsed.orderId,
          partyId: order.partyId,
          deliveryNoteId: parsed.deliveryNoteId,
          receivedBy: parsed.receivedBy,
        },
      });
      return {
        deliveryId: delivery.id,
        deliveryNoteId: parsed.deliveryNoteId,
        orderId: parsed.orderId,
        documentKind: null,
        numberingPolicy: null,
        noteNumber: null,
        externalDocumentNumber: null,
        warehouseExitId: null,
        outboundNoteId: null,
        claimsInvoice: false,
        claimsTax: false,
        confirmedLedgerPayment: false,
        paymentRequired: PAYMENT_REQUIRED_BEFORE_DELIVERY,
        bornAt: null,
        deliveredAt: parsed.deliveredAt,
        receivedBy: parsed.receivedBy,
        lineCount: lines.length,
      };
    } catch (err) {
      throw asError(err);
    }
  }

  /**
   * Legacy path: records customer delivery without auto-creating a nota.
   * Prefer RecordEntrega for receivedBy + optional deliveryNoteId.
   */
  async recordCustomerDelivery(ctx: DeliveryContext, payload: unknown): Promise<CustomerDeliveryResult> {
    try {
      const parsed = parseRecordCustomerDelivery(payload);
      const mapped = {
        orderId: parsed.orderId,
        deliveredAt: parsed.deliveredAt,
        receivedBy: parsed.deliveredTo ?? 'Sin nombre',
        recordedBy: parsed.recordedBy,
        notes: parsed.notes,
        source: parsed.source,
        quantities: parsed.quantities,
        deliveryNoteId: parsed.deliveryNoteId,
        evidenceReference: null,
        externalDocumentNumber: parsed.externalDocumentNumber,
      };
      const result = await this.recordEntrega(ctx, mapped);
      return { ...result, externalDocumentNumber: parsed.externalDocumentNumber };
    } catch (err) {
      throw asError(err);
    }
  }

  async correctDeliveryDocument(
    ctx: DeliveryContext,
    payload: unknown,
  ): Promise<CorrectDeliveryDocumentResult> {
    return this.atomically((service) => service.correctDeliveryDocumentUnit(ctx, payload));
  }

  private async correctDeliveryDocumentUnit(
    ctx: DeliveryContext,
    payload: unknown,
  ): Promise<CorrectDeliveryDocumentResult> {
    try {
      const parsed = parseCorrectDeliveryDocument(payload);
      await this.authorize(ctx, parsed.recordedBy, 'delivery_note');
      const organizationId = requireSessionOrganization(ctx.organizationId);
      const found = visibleInSession(
        organizationId,
        await this.store.getDeliveryNoteById(organizationId, parsed.deliveryNoteId),
      );
      if (!found || found.status !== 'issued') throw new Error('NOT_FOUND');
      // Serialize with every other writer on this order, then re-read: a concurrent
      // correction may have reversed the note while this one waited for the lock.
      await this.store.lockOrderForUpdate(organizationId, found.orderId);
      const original = visibleInSession(
        organizationId,
        await this.store.getDeliveryNoteById(organizationId, parsed.deliveryNoteId),
      );
      if (!original || original.status !== 'issued') throw new Error('NOT_FOUND');
      const now = ctx.effectiveAt.toISOString();
      // Guarded flip (only while still `issued`). A false return means another writer won.
      if (!(await this.store.reverseIssuedDeliveryNote(organizationId, original.id, parsed.reason))) {
        throw new Error('NOT_FOUND');
      }
      const reversalId = createId();
      const reversal: DeliveryNoteRecord = {
        ...original,
        id: reversalId,
        deliveryId: null,
        internalDocumentRef: provisionalInternalDocumentRef(reversalId),
        displayDocumentNumber: null,
        status: 'reversed',
        receivedBy: null,
        deliveredAt: null,
        correctsNoteId: original.id,
        supersedesNoteId: original.id,
        correctionReason: parsed.reason,
        createdByMemberId: parsed.recordedBy,
        bornAt: now,
        createdAt: now,
      };
      await this.store.insertDeliveryNote(reversal);
      const originalLines = await this.store.listDeliveryNoteLines(organizationId, original.id);
      await this.store.insertDeliveryNoteLines(
        originalLines.map((line) => ({
          ...line,
          id: createId(),
          noteId: reversalId,
        })),
      );
      await this.emit(organizationId, original.partyId, original.orderId, parsed.recordedBy, now, {
        eventType: 'delivery_note.corrected',
        primaryEntityId: reversalId,
        payload: {
          deliveryNoteId: reversalId,
          correctsNoteId: original.id,
          partyId: original.partyId,
          orderId: original.orderId,
          reason: parsed.reason,
        },
      });
      return {
        originalNoteId: original.id,
        reversalNoteId: reversalId,
        status: 'reversed',
        reason: parsed.reason,
      };
    } catch (err) {
      throw asError(err);
    }
  }

  async recordEvidence(ctx: DeliveryContext, payload: unknown): Promise<EvidenceRecord> {
    try {
      const parsed = parseRecordDeliveryEvidence(payload);
      const resource: DeliveryResource =
        parsed.subjectType === 'warehouse_exit'
          ? 'warehouse_exit'
          : parsed.subjectType === 'delivery_note'
            ? 'delivery_note'
            : 'delivery';
      const organizationId = await this.authorize(ctx, parsed.recordedBy, resource);
      if (parsed.subjectType === 'delivery') {
        const delivery = visibleInSession(organizationId, await this.store.getDelivery(organizationId, parsed.subjectId));
        if (!delivery) throw new Error('NOT_FOUND');
      } else if (parsed.subjectType === 'delivery_note') {
        const note = visibleInSession(
          organizationId,
          await this.store.getDeliveryNoteById(organizationId, parsed.subjectId),
        );
        if (!note) throw new Error('NOT_FOUND');
      } else {
        const exit = visibleInSession(
          organizationId,
          await this.store.getWarehouseExit(organizationId, parsed.subjectId),
        );
        if (!exit) throw new Error('NOT_FOUND');
      }
      if (parsed.authorizedBy) {
        const authorizer = await this.store.getMemberInOrg(organizationId, parsed.authorizedBy);
        if (!authorizer) throw new Error('NOT_FOUND');
        assertTenantMatch(organizationId, authorizer.organizationId);
      }
      const row: EvidenceRecord = {
        id: createId(),
        organizationId,
        subjectType: parsed.subjectType,
        subjectId: parsed.subjectId,
        role: parsed.role,
        recordedByMemberId: parsed.recordedBy,
        reference: parsed.reference,
        note: parsed.note,
        paymentState: parsed.paymentState,
        exceptionReason: parsed.exceptionReason,
        authorizedByMemberId: parsed.authorizedBy,
        recipient: parsed.recipient,
        signatureReference: parsed.signatureReference,
        confirmedLedgerPayment: false,
        ledgerPosting: 'none',
        signatureMethod: null,
        createdAt: ctx.effectiveAt.toISOString(),
      };
      await this.store.insertEvidence(row);
      return row;
    } catch (err) {
      throw asError(err);
    }
  }

  async listNotesForOrder(ctx: DeliveryContext, orderId: string): Promise<DeliveryNoteRecord[]> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    const order = await this.store.getOrderInOrg(organizationId, orderId);
    if (!order) throw new Error('NOT_FOUND');
    return denyForeignRows(organizationId, await this.store.listDeliveryNotes(organizationId, orderId));
  }

  async getWarehouseExitById(ctx: DeliveryContext, warehouseExitId: string): Promise<WarehouseExitRecord> {
    return this.readById(ctx, 'warehouse_exit', warehouseExitId, (orgId, id) =>
      this.store.getWarehouseExit(orgId, id),
    );
  }

  async getDeliveryById(ctx: DeliveryContext, deliveryId: string): Promise<DeliveryRecord> {
    return this.readById(ctx, 'delivery', deliveryId, (orgId, id) => this.store.getDelivery(orgId, id));
  }

  async getDeliveryNoteById(ctx: DeliveryContext, noteId: string): Promise<DeliveryNoteRecord> {
    return this.readById(ctx, 'delivery_note', noteId, (orgId, id) => this.store.getDeliveryNoteById(orgId, id));
  }

  async listDeliveryNoteLinesForNote(ctx: DeliveryContext, noteId: string): Promise<NoteLineRecord[]> {
    const note = await this.getDeliveryNoteById(ctx, noteId);
    return this.store.listDeliveryNoteLines(note.organizationId, note.id);
  }

  async getOrderSnapshotForNote(ctx: DeliveryContext, noteId: string) {
    const note = await this.getDeliveryNoteById(ctx, noteId);
    return this.store.getOrderInOrg(note.organizationId, note.orderId);
  }

  async listDeliveryNotesForSession(ctx: DeliveryContext): Promise<DeliveryNoteRecord[]> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    return denyForeignRows(organizationId, await this.store.listAllDeliveryNotes(organizationId));
  }

  async searchWarehouseExits(ctx: DeliveryContext, query: string): Promise<WarehouseExitRecord[]> {
    const organizationId = await this.authorizeResource(ctx, 'warehouse_exit');
    return this.matchQuery(denyForeignRows(organizationId, await this.store.listAllWarehouseExits(organizationId)), query, [
      'orderId',
      'notes',
      'id',
    ]);
  }

  async searchDeliveries(ctx: DeliveryContext, query: string): Promise<DeliveryRecord[]> {
    const organizationId = await this.authorizeResource(ctx, 'delivery');
    return this.matchQuery(denyForeignRows(organizationId, await this.store.listAllDeliveries(organizationId)), query, [
      'orderId',
      'notes',
      'deliveredTo',
      'id',
    ]);
  }

  async searchDeliveryNotes(ctx: DeliveryContext, query: string): Promise<DeliveryNoteRecord[]> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    return this.matchQuery(
      denyForeignRows(organizationId, await this.store.listAllDeliveryNotes(organizationId)),
      query,
      ['orderId', 'id', 'documentKind', 'internalDocumentRef', 'recipient'],
    );
  }

  async aggregateWarehouseExits(ctx: DeliveryContext): Promise<DeliveryAggregate> {
    const organizationId = await this.authorizeResource(ctx, 'warehouse_exit');
    const rows = denyForeignRows(organizationId, await this.store.listAllWarehouseExits(organizationId));
    return { count: rows.length };
  }

  async aggregateDeliveries(ctx: DeliveryContext): Promise<DeliveryAggregate> {
    const organizationId = await this.authorizeResource(ctx, 'delivery');
    const rows = denyForeignRows(organizationId, await this.store.listAllDeliveries(organizationId));
    return { count: rows.length };
  }

  async aggregateDeliveryNotes(ctx: DeliveryContext): Promise<DeliveryAggregate> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    const rows = denyForeignRows(organizationId, await this.store.listAllDeliveryNotes(organizationId));
    return { count: rows.length };
  }

  async suggestRecipients(ctx: DeliveryContext, query: string): Promise<string[]> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    const candidates = await this.store.listRecipientCandidates(organizationId);
    return suggestRecipientsInTenant(organizationId, candidates, query);
  }

  /**
   * Pedido timeline. Prefer recorded domain events when present (memory / future outbox).
   * Always fall back to deriving from persisted nota / salida / entrega rows so hosted
   * Pedido history does not depend on a stubbed appendDomainEvent.
   */
  async listTimelineForOrder(ctx: DeliveryContext, orderId: string): Promise<DeliveryDomainEventRecord[]> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    const order = await this.store.getOrderInOrg(organizationId, orderId);
    if (!order) throw new Error('NOT_FOUND');
    const recorded = await this.store.listDomainEvents(organizationId, orderId);
    if (recorded.length > 0) {
      return recorded.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    }
    const [notes, exits, deliveries] = await Promise.all([
      this.store.listDeliveryNotes(organizationId, orderId),
      this.store.listWarehouseExits(organizationId, orderId),
      this.store.listDeliveries(organizationId, orderId),
    ]);
    const derived: DeliveryDomainEventRecord[] = [];
    for (const note of notes) {
      derived.push({
        id: `derived:note:${note.id}`,
        organizationId,
        eventType: note.correctsNoteId ? 'delivery_note.corrected' : 'delivery_note.created',
        partyId: note.partyId,
        orderId,
        primaryEntityId: note.id,
        payload: {
          deliveryNoteId: note.id,
          orderId,
          partyId: note.partyId,
          internalDocumentRef: note.internalDocumentRef,
          numberingPolicy: note.numberingPolicy,
          correctsNoteId: note.correctsNoteId,
          reason: note.correctionReason,
        },
        occurredAt: note.bornAt,
        actorMemberId: note.createdByMemberId,
      });
    }
    for (const exit of exits) {
      derived.push({
        id: `derived:exit:${exit.id}`,
        organizationId,
        eventType: 'warehouse_exit.recorded',
        partyId: order.partyId,
        orderId,
        primaryEntityId: exit.id,
        payload: {
          warehouseExitId: exit.id,
          orderId,
          partyId: order.partyId,
          deliveryNoteId: exit.deliveryNoteId,
        },
        occurredAt: exit.exitedAt,
        actorMemberId: exit.recordedByMemberId,
      });
    }
    for (const delivery of deliveries) {
      derived.push({
        id: `derived:delivery:${delivery.id}`,
        organizationId,
        eventType: 'customer_delivery.recorded',
        partyId: order.partyId,
        orderId,
        primaryEntityId: delivery.id,
        payload: {
          deliveryId: delivery.id,
          orderId,
          partyId: order.partyId,
          deliveryNoteId: delivery.deliveryNoteId,
          receivedBy: delivery.deliveredTo ?? null,
        },
        occurredAt: delivery.deliveredAt,
        actorMemberId: delivery.recordedByMemberId,
      });
    }
    return derived.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  /**
   * ADR 0003: cumulative committed dispatch must not exceed the current confirmed
   * order-line quantity. Must run inside the locked transaction, after the fresh order read.
   */
  private async assertWithinCumulativeDispatch(
    organizationId: string,
    order: OrderSnapshot,
    ledger: DispatchLedgerName,
    lines: readonly CopiedDeliveryLine[],
  ): Promise<void> {
    if (lines.length === 0) return;
    const committed = summarizeCommittedDispatch(await this.store.listDispatchLedgerRows(organizationId, order.id));
    assertCumulativeDispatchWithinOrder(order.lines, ledger, committed, lines);
  }

  /** Read path: per-line ordered / committed / remaining for one order (ADR 0003). */
  async getDispatchBalanceForOrder(ctx: DeliveryContext, orderId: string): Promise<DispatchBalanceResult> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    const order = await this.store.getOrderInOrg(organizationId, orderId);
    if (!order) throw new Error('NOT_FOUND');
    const committed = summarizeCommittedDispatch(await this.store.listDispatchLedgerRows(organizationId, orderId));
    return { orderId, lines: computeDispatchBalance(order.lines, committed) };
  }

  /**
   * Read/report path for ADR 0003: orders whose committed dispatch already exceeds the
   * current order quantity (for example rows written before the cumulative check existed).
   * Reports only. It never edits, reverses, or deletes a historical delivery; further excess
   * dispatch on these orders is blocked by the ordinary cumulative check.
   */
  async reportOverDeliveredOrders(ctx: DeliveryContext): Promise<OverDeliveredOrderReport[]> {
    const organizationId = await this.authorizeResource(ctx, 'delivery_note');
    const [notes, exits] = await Promise.all([
      this.store.listAllDeliveryNotes(organizationId),
      this.store.listAllWarehouseExits(organizationId),
    ]);
    const orderIds = [...new Set([...notes.map((row) => row.orderId), ...exits.map((row) => row.orderId)])].sort();
    const report: OverDeliveredOrderReport[] = [];
    for (const orderId of orderIds) {
      const order = await this.store.getOrderInOrg(organizationId, orderId);
      if (!order) continue;
      const committed = summarizeCommittedDispatch(await this.store.listDispatchLedgerRows(organizationId, orderId));
      const lines = findOverDispatchedLines(order.lines, committed);
      if (lines.length > 0) report.push({ orderId, orderNumber: order.orderNumber, lines });
    }
    return report;
  }

  private async emit(
    organizationId: string,
    partyId: string,
    orderId: string,
    actorMemberId: string,
    occurredAt: string,
    input: {
      eventType: DeliveryDomainEventRecord['eventType'];
      primaryEntityId: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.store.appendDomainEvent({
      id: createId(),
      organizationId,
      eventType: input.eventType,
      partyId,
      orderId,
      primaryEntityId: input.primaryEntityId,
      payload: input.payload,
      occurredAt,
      actorMemberId,
    });
  }

  private async readById<T extends { organizationId: string }>(
    ctx: DeliveryContext,
    resource: DeliveryResource,
    id: string,
    load: (organizationId: string, id: string) => Promise<T | null>,
  ): Promise<T> {
    const organizationId = await this.authorizeResource(ctx, resource);
    const row = visibleInSession(organizationId, await load(organizationId, id));
    if (!row) throw new Error('NOT_FOUND');
    return row;
  }

  private matchQuery<T extends object>(rows: T[], query: string, fields: Array<keyof T>): T[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      fields.some((field) => {
        const value = row[field];
        return typeof value === 'string' && value.toLowerCase().includes(needle);
      }),
    );
  }

  private async authorize(
    ctx: DeliveryContext,
    recordedBy: string,
    resource?: DeliveryResource,
  ): Promise<string> {
    const organizationId = requireSessionOrganization(ctx.organizationId);
    if (recordedBy !== ctx.actorMemberId) throw new Error('PERMISSION_DENIED');
    const member = await this.store.getMemberInOrg(organizationId, ctx.actorMemberId);
    if (!member) throw new Error('TENANT_FORBIDDEN');
    assertTenantMatch(organizationId, member.organizationId);
    assertMemberActive(member.accessStatus);
    if (resource) assertDeliveryResourceRole(resource, member.grantedScopes);
    return organizationId;
  }

  private async authorizeResource(ctx: DeliveryContext, resource: DeliveryResource): Promise<string> {
    const organizationId = requireSessionOrganization(ctx.organizationId);
    if (!ctx.actorMemberId.trim()) throw new Error('PERMISSION_DENIED');
    const member = await this.store.getMemberInOrg(organizationId, ctx.actorMemberId);
    if (!member) throw new Error('TENANT_FORBIDDEN');
    assertTenantMatch(organizationId, member.organizationId);
    assertMemberActive(member.accessStatus);
    assertDeliveryResourceRole(resource, member.grantedScopes);
    return organizationId;
  }

  private async requireOpenOrder(organizationId: string, orderId: string) {
    const order = await this.store.getOrderInOrg(organizationId, orderId);
    if (!order || order.organizationId !== organizationId) throw new Error('NOT_FOUND');
    if (order.status === 'cancelled') throw new Error('VALIDATION_FAILED');
    return order;
  }

  private lineRow(organizationId: string, noteId: string, line: CopiedDeliveryLine): NoteLineRecord {
    return {
      id: createId(),
      organizationId,
      noteId,
      ...line,
    };
  }
}
