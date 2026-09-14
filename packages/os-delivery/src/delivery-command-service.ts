import { ZodError } from 'zod';
import {
  CUSTOMER_DELIVERY_NOTE_KIND,
  DELIVERY_CLAIMS_INVOICE,
  DELIVERY_CLAIMS_TAX,
  DELIVERY_NOTE_NUMBER,
  DELIVERY_NUMBERING_POLICY,
  PAYMENT_REQUIRED_BEFORE_DELIVERY,
  WAREHOUSE_OUTBOUND_KIND,
  assertDeliveryResourceRole,
  assertEventHasOccurred,
  assertNoteDoesNotPredateDelivery,
  createDeliveryNoteWithoutDelivery,
  denyForeignRows,
  parseRecordCustomerDelivery,
  parseRecordDeliveryEvidence,
  parseRecordWarehouseExit,
  requireSessionOrganization,
  storeDeliveredQuantities,
  suggestRecipientsInTenant,
  visibleInSession,
  type CopiedDeliveryLine,
  type DeliveryResource,
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
  organizationId?: string | null;
  actorMemberId: string;
  effectiveAt: Date;
};

export type DeliveryAggregate = {
  count: number;
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
      await this.authorize(ctx, parsed.recordedBy, 'warehouse_exit');
      if (Date.parse(parsed.exitedAt) > ctx.effectiveAt.getTime()) throw new Error('VALIDATION_FAILED');
      const organizationId = requireSessionOrganization(ctx.organizationId);
      const order = await this.requireOpenOrder(organizationId, parsed.orderId);
      const lines = storeDeliveredQuantities(order.lines, parsed.quantities);
      const bornAt = parsed.exitedAt;
      assertNoteDoesNotPredateDelivery(bornAt, parsed.exitedAt);
      const now = ctx.effectiveAt.toISOString();
      const exit: WarehouseExitRecord = {
        id: createId(),
        organizationId,
        orderId: parsed.orderId,
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
        exitedAt: parsed.exitedAt,
        bornAt,
        createdAt: now,
      };
      await this.store.insertWarehouseExit(exit);
      await this.store.insertOutboundNote(note);
      await this.store.insertOutboundLines(lines.map((line) => this.lineRow(organizationId, note.id, line)));
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
      await this.authorize(ctx, parsed.recordedBy, 'delivery');
      assertEventHasOccurred(parsed.deliveredAt, ctx.effectiveAt);
      const organizationId = requireSessionOrganization(ctx.organizationId);
      const order = await this.requireOpenOrder(organizationId, parsed.orderId);
      const lines = storeDeliveredQuantities(order.lines, parsed.quantities);
      const bornAt = parsed.deliveredAt;
      assertNoteDoesNotPredateDelivery(bornAt, parsed.deliveredAt);
      const now = ctx.effectiveAt.toISOString();
      const delivery: DeliveryRecord = {
        id: createId(),
        organizationId,
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
        organizationId,
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
      await this.store.insertDeliveryNoteLines(lines.map((line) => this.lineRow(organizationId, note.id, line)));
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
      const organizationId = await this.authorize(ctx, parsed.recordedBy);
      if (parsed.subjectType === 'delivery') {
        const delivery = visibleInSession(organizationId, await this.store.getDelivery(organizationId, parsed.subjectId));
        if (!delivery) throw new Error('NOT_FOUND');
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
      ['orderId', 'id', 'documentKind'],
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
    if (!order) throw new Error('NOT_FOUND');
    if (order.organizationId !== organizationId) throw new Error('TENANT_FORBIDDEN');
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
