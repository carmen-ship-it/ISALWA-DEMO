import { ZodError } from 'zod';
import {
  CUSTOMER_DELIVERY_NOTE_KIND,
  DELIVERY_CLAIMS_INVOICE,
  DELIVERY_CLAIMS_TAX,
  DELIVERY_NOTE_NUMBER,
  DELIVERY_NUMBERING_POLICY,
  PAYMENT_REQUIRED_BEFORE_DELIVERY,
  WAREHOUSE_OUTBOUND_KIND,
  assertEventHasOccurred,
  assertNoteDoesNotPredateDelivery,
  copyKnownOrderQuantities,
  createDeliveryNoteWithoutDelivery,
  parseRecordCustomerDelivery,
  parseRecordDeliveryEvidence,
  parseRecordWarehouseExit,
} from '../../os-contracts/src/delivery';
import { createId } from '../../ts-utils/src/index';
import type {
  DeliveryNoteRecord,
  DeliveryRecord,
  DeliveryStore,
  EvidenceRecord,
  NoteLineRecord,
  OutboundNoteRecord,
  WarehouseExitRecord,
} from './store-types';

export type DeliveryContext = {
  organizationId: string;
  actorMemberId: string;
  effectiveAt: Date;
};

export type WarehouseExitResult = {
  warehouseExitId: string;
  outboundNoteId: string;
  orderId: string;
  documentKind: typeof WAREHOUSE_OUTBOUND_KIND;
  numberingPolicy: typeof DELIVERY_NUMBERING_POLICY;
  noteNumber: null;
  deliveryNoteId: null;
  customerDeliveryId: null;
  claimsInvoice: false;
  claimsTax: false;
  lineCount: number;
};

export type CustomerDeliveryResult = {
  deliveryId: string;
  deliveryNoteId: string;
  orderId: string;
  documentKind: typeof CUSTOMER_DELIVERY_NOTE_KIND;
  numberingPolicy: typeof DELIVERY_NUMBERING_POLICY;
  noteNumber: null;
  warehouseExitId: null;
  outboundNoteId: null;
  claimsInvoice: false;
  claimsTax: false;
  confirmedLedgerPayment: false;
  paymentRequired: false;
  bornAt: string;
  deliveredAt: string;
  lineCount: number;
};


// Same error codes as os-domain. Local so this lane does not edit the shared domain package.
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

export class DeliveryCommandService {
  constructor(private readonly store: DeliveryStore) {}

  /** A nota de entrega cannot be opened before goods reach the customer. */
  createNoteBeforeDelivery(): never {
    return createDeliveryNoteWithoutDelivery();
  }

  async recordWarehouseExit(ctx: DeliveryContext, payload: unknown): Promise<WarehouseExitResult> {
    try {
      const parsed = parseRecordWarehouseExit(payload);
      await this.authorize(ctx, parsed.recordedBy);
      if (Date.parse(parsed.exitedAt) > ctx.effectiveAt.getTime()) throw new Error('VALIDATION_FAILED');
      const order = await this.requireOpenOrder(ctx.organizationId, parsed.orderId);
      const lines = copyKnownOrderQuantities(order.lines);
      const bornAt = parsed.exitedAt;
      assertNoteDoesNotPredateDelivery(bornAt, parsed.exitedAt);
      const now = ctx.effectiveAt.toISOString();
      const exit: WarehouseExitRecord = {
        id: createId(),
        organizationId: ctx.organizationId,
        orderId: parsed.orderId,
        exitedAt: parsed.exitedAt,
        recordedByMemberId: parsed.recordedBy,
        source: parsed.source,
        notes: parsed.notes,
        createdAt: now,
      };
      const note: OutboundNoteRecord = {
        id: createId(),
        organizationId: ctx.organizationId,
        warehouseExitId: exit.id,
        orderId: parsed.orderId,
        documentKind: WAREHOUSE_OUTBOUND_KIND,
        numberingPolicy: DELIVERY_NUMBERING_POLICY,
        noteNumber: DELIVERY_NOTE_NUMBER,
        exitedAt: parsed.exitedAt,
        bornAt,
        createdAt: now,
      };
      await this.store.insertWarehouseExit(exit);
      await this.store.insertOutboundNote(note);
      await this.store.insertOutboundLines(lines.map((line) => this.lineRow(ctx.organizationId, note.id, line)));
      return {
        warehouseExitId: exit.id,
        outboundNoteId: note.id,
        orderId: parsed.orderId,
        documentKind: WAREHOUSE_OUTBOUND_KIND,
        numberingPolicy: DELIVERY_NUMBERING_POLICY,
        noteNumber: null,
        deliveryNoteId: null,
        customerDeliveryId: null,
        claimsInvoice: false,
        claimsTax: false,
        lineCount: lines.length,
      };
    } catch (err) {
      throw asError(err);
    }
  }

  async recordCustomerDelivery(ctx: DeliveryContext, payload: unknown): Promise<CustomerDeliveryResult> {
    try {
      const parsed = parseRecordCustomerDelivery(payload);
      await this.authorize(ctx, parsed.recordedBy);
      assertEventHasOccurred(parsed.deliveredAt, ctx.effectiveAt);
      const order = await this.requireOpenOrder(ctx.organizationId, parsed.orderId);
      const lines = copyKnownOrderQuantities(order.lines);
      const bornAt = parsed.deliveredAt;
      assertNoteDoesNotPredateDelivery(bornAt, parsed.deliveredAt);
      const now = ctx.effectiveAt.toISOString();
      const delivery: DeliveryRecord = {
        id: createId(),
        organizationId: ctx.organizationId,
        orderId: parsed.orderId,
        deliveredAt: parsed.deliveredAt,
        deliveredTo: parsed.deliveredTo,
        recordedByMemberId: parsed.recordedBy,
        source: parsed.source,
        notes: parsed.notes,
        createdAt: now,
      };
      const note: DeliveryNoteRecord = {
        id: createId(),
        organizationId: ctx.organizationId,
        deliveryId: delivery.id,
        orderId: parsed.orderId,
        documentKind: CUSTOMER_DELIVERY_NOTE_KIND,
        numberingPolicy: DELIVERY_NUMBERING_POLICY,
        noteNumber: DELIVERY_NOTE_NUMBER,
        deliveredAt: parsed.deliveredAt,
        bornAt,
        claimsInvoice: DELIVERY_CLAIMS_INVOICE,
        claimsTax: DELIVERY_CLAIMS_TAX,
        createdAt: now,
      };
      await this.store.insertDelivery(delivery);
      await this.store.insertDeliveryNote(note);
      await this.store.insertDeliveryNoteLines(lines.map((line) => this.lineRow(ctx.organizationId, note.id, line)));
      return {
        deliveryId: delivery.id,
        deliveryNoteId: note.id,
        orderId: parsed.orderId,
        documentKind: CUSTOMER_DELIVERY_NOTE_KIND,
        numberingPolicy: DELIVERY_NUMBERING_POLICY,
        noteNumber: null,
        warehouseExitId: null,
        outboundNoteId: null,
        claimsInvoice: false,
        claimsTax: false,
        confirmedLedgerPayment: false,
        paymentRequired: PAYMENT_REQUIRED_BEFORE_DELIVERY,
        bornAt,
        deliveredAt: parsed.deliveredAt,
        lineCount: lines.length,
      };
    } catch (err) {
      throw asError(err);
    }
  }

  async recordEvidence(ctx: DeliveryContext, payload: unknown): Promise<EvidenceRecord> {
    try {
      const parsed = parseRecordDeliveryEvidence(payload);
      await this.authorize(ctx, parsed.recordedBy);
      if (parsed.subjectType === 'delivery') {
        const delivery = await this.store.getDelivery(ctx.organizationId, parsed.subjectId);
        if (!delivery) throw new Error('NOT_FOUND');
      } else {
        const exit = await this.store.getWarehouseExit(ctx.organizationId, parsed.subjectId);
        if (!exit) throw new Error('NOT_FOUND');
      }
      if (parsed.authorizedBy) {
        const authorizer = await this.store.getMemberInOrg(ctx.organizationId, parsed.authorizedBy);
        if (!authorizer) throw new Error('NOT_FOUND');
        assertTenantMatch(ctx.organizationId, authorizer.organizationId);
      }
      const row: EvidenceRecord = {
        id: createId(),
        organizationId: ctx.organizationId,
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
    await this.authorizeReader(ctx);
    const order = await this.store.getOrderInOrg(ctx.organizationId, orderId);
    if (!order) throw new Error('NOT_FOUND');
    return this.store.listDeliveryNotes(ctx.organizationId, orderId);
  }

  private async authorize(ctx: DeliveryContext, recordedBy: string): Promise<void> {
    if (recordedBy !== ctx.actorMemberId) throw new Error('PERMISSION_DENIED');
    const member = await this.store.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!member) throw new Error('TENANT_FORBIDDEN');
    assertTenantMatch(ctx.organizationId, member.organizationId);
    assertMemberActive(member.accessStatus);
  }

  private async authorizeReader(ctx: DeliveryContext): Promise<void> {
    const member = await this.store.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!member) throw new Error('TENANT_FORBIDDEN');
    assertTenantMatch(ctx.organizationId, member.organizationId);
    assertMemberActive(member.accessStatus);
  }

  private async requireOpenOrder(organizationId: string, orderId: string) {
    const order = await this.store.getOrderInOrg(organizationId, orderId);
    if (!order) throw new Error('NOT_FOUND');
    if (order.organizationId !== organizationId) throw new Error('TENANT_FORBIDDEN');
    if (order.status === 'cancelled') throw new Error('VALIDATION_FAILED');
    return order;
  }

  private lineRow(organizationId: string, noteId: string, line: ReturnType<typeof copyKnownOrderQuantities>[number]): NoteLineRecord {
    return {
      id: createId(),
      organizationId,
      noteId,
      ...line,
    };
  }
}
