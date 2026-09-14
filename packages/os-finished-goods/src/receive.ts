/**
 * Warehouse receive command. warehouse.finished_goods.receive is not allocate.
 * A receipt does not assign a Pedido, post stock, or create Order → ProductionRun.
 */

import { canReceiveFinishedGoods } from '../../os-contracts/src/operations-scopes';

export const FINISHED_GOODS_RECEIVE_SCOPE = 'warehouse.finished_goods.receive' as const;
export const FINISHED_GOODS_ALLOCATE_SCOPE = 'warehouse.finished_goods.allocate' as const;
export const FINISHED_GOODS_WAREHOUSE_LABEL = 'Almacén de Productos Terminados' as const;
export const FINISHED_GOODS_RECEIVED_EVENT = 'finished_goods.received' as const;
export const FINISHED_GOODS_CORRECTED_EVENT = 'finished_goods.corrected' as const;
export const FINISHED_GOODS_MIGRATION_APPLIED = false as const;

const QUANTITY = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export type FinishedGoodsReceiptRecord = {
  id: string;
  organizationId: string;
  productId: string;
  quantity: string;
  warehouseLabel: typeof FINISHED_GOODS_WAREHOUSE_LABEL;
  receivedAt: string;
  recordedAt: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: 'explicit_command';
  productionTraceEntryId: string | null;
  quemaId: string | null;
  correctsReceiptId: string | null;
  correctionReason: string | null;
  idempotencyKey: string | null;
  allocatesToOrder: false;
  postsStock: false;
  officialStock: false;
};

export type FinishedGoodsEventRecord = {
  id: string;
  organizationId: string;
  eventType: typeof FINISHED_GOODS_RECEIVED_EVENT | typeof FINISHED_GOODS_CORRECTED_EVENT;
  occurredAt: string;
  recordedAt: string;
  actorMemberId: string | null;
  primaryEntityType: 'finished_goods_receipt';
  primaryEntityId: string;
  capabilityKey: typeof FINISHED_GOODS_RECEIVE_SCOPE;
  correlationId: string;
  idempotencyKey: string | null;
  provenance: 'command';
};

export type FinishedGoodsWriteStore = {
  findByIdempotency(organizationId: string, idempotencyKey: string): Promise<FinishedGoodsReceiptRecord | null>;
  findInOrg(organizationId: string, receiptId: string): Promise<FinishedGoodsReceiptRecord | null>;
  proveProductionCitation(
    organizationId: string,
    citation: { productionTraceEntryId?: string | null; quemaId?: string | null },
  ): Promise<boolean>;
  insertReceipt(receipt: FinishedGoodsReceiptRecord): Promise<void>;
  appendEvent(event: FinishedGoodsEventRecord): Promise<void>;
};

export type ReceiveSession = {
  organizationId?: string | null;
  actorMemberId?: string | null;
  actorLabel?: string | null;
  accessStatus?: string | null;
  grantedScopes?: readonly string[] | null;
};

export type ReceiveFinishedGoodsInput = {
  productId?: unknown;
  quantity?: unknown;
  receivedAt?: unknown;
  productionTraceEntryId?: unknown;
  quemaId?: unknown;
  correctsReceiptId?: unknown;
  correctionReason?: unknown;
  idempotencyKey?: unknown;
  correlationId?: unknown;
  orderId?: unknown;
  orderLineId?: unknown;
  sku?: unknown;
};

export type ReceiveDenialReason =
  | 'session_org_required'
  | 'access_revoked'
  | 'unauthorized'
  | 'invalid'
  | 'order_link_rejected'
  | 'not_found'
  | 'citation_not_in_org';

export type ReceiveFinishedGoodsResult =
  | {
      ok: true;
      receipt: FinishedGoodsReceiptRecord;
      event: FinishedGoodsEventRecord;
      replayed: boolean;
      migrationApplied: false;
      liveWrite: 'prisma_port';
    }
  | {
      ok: false;
      reason: ReceiveDenialReason;
      migrationApplied: false;
      liveWrite: 'prisma_port';
    };

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function denied(reason: ReceiveDenialReason): ReceiveFinishedGoodsResult {
  return { ok: false, reason, migrationApplied: false, liveWrite: 'prisma_port' };
}

function positiveQuantity(value: unknown): string | null {
  const quantity = text(value);
  if (!QUANTITY.test(quantity)) return null;
  if (Number(quantity) <= 0) return null;
  return quantity;
}

export function receiveAuthorizesAllocate(): false {
  return false;
}

export async function receiveFinishedGoods(input: {
  session: ReceiveSession | null | undefined;
  store: FinishedGoodsWriteStore;
  command: ReceiveFinishedGoodsInput;
  now?: Date;
  id?: string;
}): Promise<ReceiveFinishedGoodsResult> {
  const organizationId = text(input.session?.organizationId);
  if (!input.session || !organizationId) return denied('session_org_required');
  if (input.session.accessStatus !== 'active') return denied('access_revoked');
  if (!canReceiveFinishedGoods(input.session.grantedScopes ?? [])) return denied('unauthorized');
  if (text(input.command.orderId) || text(input.command.orderLineId) || text(input.command.sku)) {
    return denied('order_link_rejected');
  }

  const idempotencyKey = text(input.command.idempotencyKey) || null;
  if (idempotencyKey) {
    const existing = await input.store.findByIdempotency(organizationId, idempotencyKey);
    if (existing) {
      if (existing.organizationId !== organizationId) return denied('not_found');
      return {
        ok: true,
        receipt: existing,
        event: {
          id: `evt-replay-${existing.id}`,
          organizationId,
          eventType: existing.correctsReceiptId ? FINISHED_GOODS_CORRECTED_EVENT : FINISHED_GOODS_RECEIVED_EVENT,
          occurredAt: existing.receivedAt,
          recordedAt: existing.recordedAt,
          actorMemberId: existing.actorMemberId,
          primaryEntityType: 'finished_goods_receipt',
          primaryEntityId: existing.id,
          capabilityKey: FINISHED_GOODS_RECEIVE_SCOPE,
          correlationId: text(input.command.correlationId) || existing.id,
          idempotencyKey,
          provenance: 'command',
        },
        replayed: true,
        migrationApplied: false,
        liveWrite: 'prisma_port',
      };
    }
  }

  const productId = text(input.command.productId);
  const quantity = positiveQuantity(input.command.quantity);
  const receivedAt = text(input.command.receivedAt);
  const actorLabel = text(input.session.actorLabel);
  if (!productId || !quantity || !receivedAt || Number.isNaN(Date.parse(receivedAt)) || !actorLabel) {
    return denied('invalid');
  }

  const productionTraceEntryId = text(input.command.productionTraceEntryId) || null;
  const quemaId = text(input.command.quemaId) || null;
  if (productionTraceEntryId || quemaId) {
    const proven = await input.store.proveProductionCitation(organizationId, {
      productionTraceEntryId,
      quemaId,
    });
    if (!proven) return denied('citation_not_in_org');
  }

  const correctsReceiptId = text(input.command.correctsReceiptId) || null;
  const correctionReason = text(input.command.correctionReason) || null;
  if (Boolean(correctsReceiptId) !== Boolean(correctionReason)) return denied('invalid');
  if (correctsReceiptId) {
    const prior = await input.store.findInOrg(organizationId, correctsReceiptId);
    if (!prior || prior.organizationId !== organizationId) return denied('not_found');
  }

  const now = (input.now ?? new Date()).toISOString();
  const id = text(input.id) || `fgr-${organizationId}-${now}`;
  const receipt: FinishedGoodsReceiptRecord = {
    id,
    organizationId,
    productId,
    quantity,
    warehouseLabel: FINISHED_GOODS_WAREHOUSE_LABEL,
    receivedAt: new Date(receivedAt).toISOString(),
    recordedAt: now,
    actorMemberId: text(input.session.actorMemberId) || null,
    actorLabel,
    source: 'explicit_command',
    productionTraceEntryId,
    quemaId,
    correctsReceiptId,
    correctionReason,
    idempotencyKey,
    allocatesToOrder: false,
    postsStock: false,
    officialStock: false,
  };
  const event: FinishedGoodsEventRecord = {
    id: `evt-${id}`,
    organizationId,
    eventType: correctsReceiptId ? FINISHED_GOODS_CORRECTED_EVENT : FINISHED_GOODS_RECEIVED_EVENT,
    occurredAt: receipt.receivedAt,
    recordedAt: now,
    actorMemberId: receipt.actorMemberId,
    primaryEntityType: 'finished_goods_receipt',
    primaryEntityId: id,
    capabilityKey: FINISHED_GOODS_RECEIVE_SCOPE,
    correlationId: text(input.command.correlationId) || id,
    idempotencyKey,
    provenance: 'command',
  };
  await input.store.insertReceipt(receipt);
  await input.store.appendEvent(event);
  return {
    ok: true,
    receipt,
    event,
    replayed: false,
    migrationApplied: false,
    liveWrite: 'prisma_port',
  };
}

export class MemoryFinishedGoodsWriteStore implements FinishedGoodsWriteStore {
  readonly receipts: FinishedGoodsReceiptRecord[] = [];
  readonly events: FinishedGoodsEventRecord[] = [];
  readonly citations = new Set<string>();

  async findByIdempotency(organizationId: string, idempotencyKey: string) {
    return (
      this.receipts.find(
        (row) => row.organizationId === organizationId && row.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async findInOrg(organizationId: string, receiptId: string) {
    return this.receipts.find((row) => row.organizationId === organizationId && row.id === receiptId) ?? null;
  }

  async proveProductionCitation(
    organizationId: string,
    citation: { productionTraceEntryId?: string | null; quemaId?: string | null },
  ) {
    const trace = citation.productionTraceEntryId?.trim();
    const quema = citation.quemaId?.trim();
    if (trace && !this.citations.has(`${organizationId}:trace:${trace}`)) return false;
    if (quema && !this.citations.has(`${organizationId}:quema:${quema}`)) return false;
    return true;
  }

  async insertReceipt(receipt: FinishedGoodsReceiptRecord) {
    this.receipts.push(receipt);
  }

  async appendEvent(event: FinishedGoodsEventRecord) {
    this.events.push(event);
  }
}

type PrismaReceiptDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<FinishedGoodsReceiptRecord | null>;
  create(args: { data: FinishedGoodsReceiptRecord }): Promise<unknown>;
};

type PrismaEventDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

export type FinishedGoodsPrismaPort = {
  osFinishedGoodsReceipt: PrismaReceiptDelegate;
  osBusinessEvent: PrismaEventDelegate;
  osProductionTraceEntry?: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
  };
  osProductionQuema?: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
  };
};

export function createPrismaFinishedGoodsWriteStore(prisma: FinishedGoodsPrismaPort): FinishedGoodsWriteStore {
  return {
    async findByIdempotency(organizationId, idempotencyKey) {
      return prisma.osFinishedGoodsReceipt.findFirst({
        where: { organizationId, idempotencyKey },
      });
    },
    async findInOrg(organizationId, receiptId) {
      return prisma.osFinishedGoodsReceipt.findFirst({
        where: { organizationId, id: receiptId },
      });
    },
    async proveProductionCitation(organizationId, citation) {
      if (citation.productionTraceEntryId) {
        const row = await prisma.osProductionTraceEntry?.findFirst({
          where: { organizationId, id: citation.productionTraceEntryId },
        });
        if (!row) return false;
      }
      if (citation.quemaId) {
        const row = await prisma.osProductionQuema?.findFirst({
          where: { organizationId, id: citation.quemaId },
        });
        if (!row) return false;
      }
      return true;
    },
    async insertReceipt(receipt) {
      await prisma.osFinishedGoodsReceipt.create({ data: receipt });
    },
    async appendEvent(event) {
      await prisma.osBusinessEvent.create({
        data: {
          id: event.id,
          organizationId: event.organizationId,
          eventType: event.eventType,
          occurredAt: new Date(event.occurredAt),
          recordedAt: new Date(event.recordedAt),
          actorMemberId: event.actorMemberId,
          primaryEntityType: event.primaryEntityType,
          primaryEntityId: event.primaryEntityId,
          capabilityKey: event.capabilityKey,
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          provenance: event.provenance,
        },
      });
    },
  };
}
