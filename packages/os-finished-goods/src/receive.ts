/**
 * Warehouse receive command. warehouse.finished_goods.receive is not allocate.
 *
 * Physical receipt may cite Pedido / order-line context for operations and timeline.
 * That citation is not allocation, reservation, FIFO, valuation, or stock posting.
 * Bare orderId / orderLineId / sku still mean "allocation-shaped link" and are rejected.
 *
 * Persistence constitution:
 * - Durable OsFinishedGoodsReceipt columns only (no allocate/FIFO/stock flags on disk)
 * - Tenant predicates on every lookup / proof / write
 * - Org-scoped idempotency (partial unique index) with replay on conflict
 * - Receipt + business event persist atomically when $transaction is available
 */

import { canReceiveFinishedGoods } from '@isalwa/os-contracts';

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
  /** Operational Pedido context. Not allocation. */
  contextOrderId: string | null;
  contextOrderLineId: string | null;
  contextPartyId: string | null;
  note: string | null;
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
  /** Timeline / Cliente360 association. Never invents party without Pedido context. */
  payload: {
    productId: string;
    quantity: string;
    allocatesToOrder: false;
    postsStock: false;
    orderId: string | null;
    orderLineId: string | null;
    partyId: string | null;
    note: string | null;
  };
};

export type OrderLineContextProof = {
  organizationId: string;
  orderId: string;
  orderLineId: string;
  productId: string;
  partyId: string | null;
};

export type FinishedGoodsWriteStore = {
  findByIdempotency(organizationId: string, idempotencyKey: string): Promise<FinishedGoodsReceiptRecord | null>;
  findInOrg(organizationId: string, receiptId: string): Promise<FinishedGoodsReceiptRecord | null>;
  proveProductionCitation(
    organizationId: string,
    citation: { productionTraceEntryId?: string | null; quemaId?: string | null },
  ): Promise<boolean>;
  /**
   * Prove Pedido / line / product belong to the session organization.
   * Invalid or foreign targets return null (not-found equivalence).
   */
  proveOrderLineContext(
    organizationId: string,
    citation: { orderId: string; orderLineId: string; productId: string },
  ): Promise<OrderLineContextProof | null>;
  /**
   * Durable receipt + business event.
   * Prisma port uses $transaction when available; unique (org, idempotency) → idempotent_replay.
   */
  persistReceiptAndEvent(
    receipt: FinishedGoodsReceiptRecord,
    event: FinishedGoodsEventRecord,
  ): Promise<'inserted' | 'idempotent_replay'>;
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
  /** Pedido context citation — not allocation. */
  contextOrderId?: unknown;
  contextOrderLineId?: unknown;
  note?: unknown;
  correctsReceiptId?: unknown;
  correctionReason?: unknown;
  idempotencyKey?: unknown;
  correlationId?: unknown;
  /** Allocation-shaped fields — always rejected. */
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
  | 'citation_not_in_org'
  | 'invalid_order_context';

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

function eventPayload(receipt: FinishedGoodsReceiptRecord): FinishedGoodsEventRecord['payload'] {
  return {
    productId: receipt.productId,
    quantity: receipt.quantity,
    allocatesToOrder: false,
    postsStock: false,
    orderId: receipt.contextOrderId,
    orderLineId: receipt.contextOrderLineId,
    partyId: receipt.contextPartyId,
    note: receipt.note,
  };
}

function replayEvent(
  existing: FinishedGoodsReceiptRecord,
  organizationId: string,
  correlationId: string,
  idempotencyKey: string | null,
): FinishedGoodsEventRecord {
  return {
    id: `evt-replay-${existing.id}`,
    organizationId,
    eventType: existing.correctsReceiptId ? FINISHED_GOODS_CORRECTED_EVENT : FINISHED_GOODS_RECEIVED_EVENT,
    occurredAt: existing.receivedAt,
    recordedAt: existing.recordedAt,
    actorMemberId: existing.actorMemberId,
    primaryEntityType: 'finished_goods_receipt',
    primaryEntityId: existing.id,
    capabilityKey: FINISHED_GOODS_RECEIVE_SCOPE,
    correlationId,
    idempotencyKey,
    provenance: 'command',
    payload: eventPayload(existing),
  };
}

function replayResult(
  existing: FinishedGoodsReceiptRecord,
  organizationId: string,
  correlationId: string,
  idempotencyKey: string | null,
): ReceiveFinishedGoodsResult {
  return {
    ok: true,
    receipt: existing,
    event: replayEvent(existing, organizationId, correlationId, idempotencyKey),
    replayed: true,
    migrationApplied: false,
    liveWrite: 'prisma_port',
  };
}

export function receiveAuthorizesAllocate(): false {
  return false;
}

/** Pedido context on a receipt is operational evidence, never an allocation. */
export function receiveContextAllocatesToOrder(): false {
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
  const correlationId = text(input.command.correlationId);
  if (idempotencyKey) {
    const existing = await input.store.findByIdempotency(organizationId, idempotencyKey);
    if (existing) {
      if (existing.organizationId !== organizationId) return denied('not_found');
      return replayResult(existing, organizationId, correlationId || existing.id, idempotencyKey);
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

  const contextOrderId = text(input.command.contextOrderId) || null;
  const contextOrderLineId = text(input.command.contextOrderLineId) || null;
  if (Boolean(contextOrderId) !== Boolean(contextOrderLineId)) {
    return denied('invalid_order_context');
  }

  let contextPartyId: string | null = null;
  if (contextOrderId && contextOrderLineId) {
    const proven = await input.store.proveOrderLineContext(organizationId, {
      orderId: contextOrderId,
      orderLineId: contextOrderLineId,
      productId,
    });
    if (!proven || proven.organizationId !== organizationId) {
      return denied('invalid_order_context');
    }
    contextPartyId = proven.partyId;
  }

  const note = text(input.command.note) || null;

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
    contextOrderId,
    contextOrderLineId,
    contextPartyId,
    note,
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
    correlationId: correlationId || id,
    idempotencyKey,
    provenance: 'command',
    payload: eventPayload(receipt),
  };

  const outcome = await input.store.persistReceiptAndEvent(receipt, event);
  if (outcome === 'idempotent_replay') {
    if (!idempotencyKey) throw new Error('finished_goods_receive_persist_failed');
    const existing = await input.store.findByIdempotency(organizationId, idempotencyKey);
    if (!existing || existing.organizationId !== organizationId) {
      throw new Error('finished_goods_receive_persist_failed');
    }
    return replayResult(existing, organizationId, correlationId || existing.id, idempotencyKey);
  }

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
  readonly orderLines = new Map<string, OrderLineContextProof>();

  seedOrderLine(proof: OrderLineContextProof) {
    this.orderLines.set(
      `${proof.organizationId}:${proof.orderId}:${proof.orderLineId}:${proof.productId}`,
      proof,
    );
  }

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

  async proveOrderLineContext(
    organizationId: string,
    citation: { orderId: string; orderLineId: string; productId: string },
  ) {
    const key = `${organizationId}:${citation.orderId}:${citation.orderLineId}:${citation.productId}`;
    return this.orderLines.get(key) ?? null;
  }

  async persistReceiptAndEvent(receipt: FinishedGoodsReceiptRecord, event: FinishedGoodsEventRecord) {
    if (receipt.organizationId !== event.organizationId) {
      throw new Error('TENANT_MISMATCH');
    }
    if (receipt.idempotencyKey) {
      const existing = this.receipts.find(
        (row) =>
          row.organizationId === receipt.organizationId && row.idempotencyKey === receipt.idempotencyKey,
      );
      if (existing) return 'idempotent_replay';
    }
    this.receipts.push(receipt);
    this.events.push(event);
    return 'inserted';
  }
}

/** Durable row shape for OsFinishedGoodsReceipt — no domain-only flags. */
type PrismaReceiptRow = {
  id: string;
  organizationId: string;
  productId: string;
  quantity: string;
  warehouseLabel: string;
  receivedAt: Date | string;
  recordedAt: Date | string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  productionTraceEntryId: string | null;
  quemaId: string | null;
  contextOrderId: string | null;
  contextOrderLineId: string | null;
  contextPartyId: string | null;
  note: string | null;
  correctsReceiptId: string | null;
  correctionReason: string | null;
  idempotencyKey: string | null;
};

type PrismaReceiptDelegate = {
  findFirst(args: { where: Record<string, unknown> }): Promise<PrismaReceiptRow | null>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

type PrismaEventDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

export type FinishedGoodsPrismaPort = {
  osFinishedGoodsReceipt: PrismaReceiptDelegate;
  osBusinessEvent: PrismaEventDelegate;
  /** Present on PrismaClient — used for atomic receipt + event persist. */
  $transaction?: (ops: Promise<unknown>[]) => Promise<unknown>;
  osProductionTraceEntry?: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
  };
  osProductionQuema?: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
  };
  osOrder?: {
    findFirst(args: {
      where: Record<string, unknown>;
      select?: Record<string, boolean>;
    }): Promise<{ id: string; partyId: string | null } | null>;
  };
  osOrderLine?: {
    findFirst(args: {
      where: Record<string, unknown>;
      select?: Record<string, boolean>;
    }): Promise<{ id: string; orderId: string; productRefSnapshot: string | null } | null>;
  };
};

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function fromPrismaReceipt(row: PrismaReceiptRow): FinishedGoodsReceiptRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    productId: row.productId,
    quantity: row.quantity,
    warehouseLabel: FINISHED_GOODS_WAREHOUSE_LABEL,
    receivedAt: asIso(row.receivedAt),
    recordedAt: asIso(row.recordedAt),
    actorMemberId: row.actorMemberId,
    actorLabel: row.actorLabel,
    source: 'explicit_command',
    productionTraceEntryId: row.productionTraceEntryId,
    quemaId: row.quemaId,
    contextOrderId: row.contextOrderId,
    contextOrderLineId: row.contextOrderLineId,
    contextPartyId: row.contextPartyId,
    note: row.note,
    correctsReceiptId: row.correctsReceiptId,
    correctionReason: row.correctionReason,
    idempotencyKey: row.idempotencyKey,
    allocatesToOrder: false,
    postsStock: false,
    officialStock: false,
  };
}

function toPrismaReceiptData(receipt: FinishedGoodsReceiptRecord): Record<string, unknown> {
  return {
    id: receipt.id,
    organizationId: receipt.organizationId,
    productId: receipt.productId,
    quantity: receipt.quantity,
    warehouseLabel: receipt.warehouseLabel,
    receivedAt: new Date(receipt.receivedAt),
    recordedAt: new Date(receipt.recordedAt),
    actorMemberId: receipt.actorMemberId,
    actorLabel: receipt.actorLabel,
    source: receipt.source,
    productionTraceEntryId: receipt.productionTraceEntryId,
    quemaId: receipt.quemaId,
    contextOrderId: receipt.contextOrderId,
    contextOrderLineId: receipt.contextOrderLineId,
    contextPartyId: receipt.contextPartyId,
    note: receipt.note,
    correctsReceiptId: receipt.correctsReceiptId,
    correctionReason: receipt.correctionReason,
    idempotencyKey: receipt.idempotencyKey,
  };
}

function toPrismaEventData(event: FinishedGoodsEventRecord): Record<string, unknown> {
  return {
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
    payloadJson: event.payload,
  };
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String((err as { code?: unknown }).code ?? '') : '';
  // Prisma unique violations only. Do NOT match bare "idempotency" — Prisma dumps
  // field names in unrelated errors and that falsely returned idempotent_replay,
  // which then threw finished_goods_receive_persist_failed (HTTP 500).
  if (code === 'P2002') return true;
  const message = err instanceof Error ? err.message : String(err);
  return /unique constraint failed/i.test(message);
}

export function createPrismaFinishedGoodsWriteStore(prisma: FinishedGoodsPrismaPort): FinishedGoodsWriteStore {
  return {
    async findByIdempotency(organizationId, idempotencyKey) {
      const row = await prisma.osFinishedGoodsReceipt.findFirst({
        where: { organizationId, idempotencyKey },
      });
      return row ? fromPrismaReceipt(row) : null;
    },
    async findInOrg(organizationId, receiptId) {
      const row = await prisma.osFinishedGoodsReceipt.findFirst({
        where: { organizationId, id: receiptId },
      });
      return row ? fromPrismaReceipt(row) : null;
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
    async proveOrderLineContext(organizationId, citation) {
      if (!prisma.osOrder || !prisma.osOrderLine) return null;
      const order = await prisma.osOrder.findFirst({
        where: { organizationId, id: citation.orderId },
        select: { id: true, partyId: true },
      });
      if (!order || order.id !== citation.orderId) return null;
      const line = await prisma.osOrderLine.findFirst({
        where: { organizationId, id: citation.orderLineId, orderId: citation.orderId },
        select: { id: true, orderId: true, productRefSnapshot: true },
      });
      if (!line || line.id !== citation.orderLineId) return null;
      // Match UI handoff: productId = productRefSnapshot || orderLineId.
      const productKey = (line.productRefSnapshot?.trim() || line.id).trim();
      if (productKey !== citation.productId) return null;
      return {
        organizationId,
        orderId: citation.orderId,
        orderLineId: citation.orderLineId,
        productId: citation.productId,
        partyId: order.partyId,
      };
    },
    async persistReceiptAndEvent(receipt, event) {
      if (receipt.organizationId !== event.organizationId) {
        throw new Error('TENANT_MISMATCH');
      }
      const receiptData = toPrismaReceiptData(receipt);
      const eventData = toPrismaEventData(event);
      try {
        // Call $transaction as a method (never extract unbound). Unbound calls lose
        // Prisma `this` and throw: Cannot read properties of undefined (reading '_tracingHelper').
        if (typeof prisma.$transaction === 'function') {
          await prisma.$transaction([
            prisma.osFinishedGoodsReceipt.create({ data: receiptData }),
            prisma.osBusinessEvent.create({ data: eventData }),
          ]);
        } else {
          await prisma.osFinishedGoodsReceipt.create({ data: receiptData });
          await prisma.osBusinessEvent.create({ data: eventData });
        }
        return 'inserted';
      } catch (err) {
        if (receipt.idempotencyKey && isUniqueViolation(err)) {
          return 'idempotent_replay';
        }
        throw err;
      }
    },
  };
}
