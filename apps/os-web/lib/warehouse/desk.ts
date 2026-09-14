import {
  decideAllocation,
  observeFinishedGoodsReceipt,
  ORDER_ALLOCATION_SOURCE,
  parseQuantity,
  type AllocateFinishedGoodsResult,
  type OrderAllocation,
} from '@isalwa/os-contracts';
import {
  buildWarehouseTaskView,
  canAllocateFinishedGoods,
  netAllocatedQuantity,
  projectSameTenantAvailability,
  remainForPedido,
  sessionOrganizationId,
  suggestSameTenantPedidos,
  WAREHOUSE_MISSING_NAME,
  type WarehouseAllocationCorrection,
  type WarehouseDenialReason,
  type WarehousePedidoFact,
  type WarehousePedidoOption,
  type WarehouseReceiptFact,
  type WarehouseRemainRow,
  type WarehouseTaskView,
} from '@isalwa/os-contracts';

export type { WarehousePedidoFact };

/**
 * Session-gated finished-goods assignment.
 * A receipt does not allocate. A correction does not delete the original row.
 * Availability is never another tenant's receipts and never official stock.
 */

export type WarehouseActorSession = {
  organizationId?: string | null;
  memberId?: string | null;
  actorLabel?: string | null;
  grantedScopes?: readonly string[] | null;
  accessStatus?: string | null;
  cargo?: string | null;
  title?: string | null;
};

export type WarehouseDenial = {
  ok: false;
  reason: WarehouseDenialReason;
  officialStock: false;
};

export type WarehouseFacts = {
  receipts: readonly WarehouseReceiptFact[] | null;
  pedidos: readonly WarehousePedidoFact[];
};

type AllocateBody = {
  id: string;
  organizationId?: string | null;
  productId: string;
  quantity: string;
  orderLineId: string;
  orderLineOrganizationId?: string | null;
  allocatedAt: string;
  recordedAt: string;
  actorMemberId?: string | null;
  actorLabel?: string | null;
  source?: string;
  finishedGoodsReceiptId?: string | null;
  finishedGoodsReceiptOrganizationId?: string | null;
  knownAvailableQuantity?: string | null;
  receipts?: readonly WarehouseReceiptFact[] | null;
  idempotencyKey?: string | null;
  cargo?: string | null;
  title?: string | null;
};

type CorrectBody = {
  id: string;
  allocationId: string;
  organizationId?: string | null;
  quantity: string;
  reason: string;
  correctedAt: string;
  recordedAt: string;
  actorMemberId?: string | null;
  actorLabel?: string | null;
};

export type WarehouseRemainingAggregate = {
  ok: true;
  organizationId: string;
  officialStock: false;
  byProduct: Array<{
    productId: string;
    availableQuantity: string | null;
    receiptQuantity: string | null;
    officialStock: false;
  }>;
  byLine: WarehouseRemainRow[];
};

export class WarehouseAllocationDesk {
  private readonly allocations: OrderAllocation[] = [];
  private readonly corrections: WarehouseAllocationCorrection[] = [];

  observeFinishedGoodsReceipt(input: unknown): {
    allocated: false;
    allocation: null;
    receiptCreated: false;
  } {
    return observeFinishedGoodsReceipt(input);
  }

  allocate(
    session: WarehouseActorSession | null,
    body: AllocateBody,
    facts: WarehouseFacts,
  ): AllocateFinishedGoodsResult | WarehouseDenial | { ok: false; reason: 'not_found'; officialStock: false } {
    const gate = requireAllocator(session, body.organizationId);
    if (!gate.ok) return gate;
    const lineTenant = body.orderLineOrganizationId?.trim() || gate.organizationId;
    if (lineTenant !== gate.organizationId) {
      return denied('cross_tenant');
    }
    const receiptTenant = body.finishedGoodsReceiptOrganizationId?.trim() || null;
    if (receiptTenant && receiptTenant !== gate.organizationId) {
      return denied('cross_tenant');
    }
    const line = facts.pedidos.find(
      (pedido) => pedido.orderLineId === body.orderLineId && pedido.organizationId === gate.organizationId,
    );
    if (!line) return { ok: false, reason: 'not_found', officialStock: false };

    const availability = projectSameTenantAvailability({
      organizationId: gate.organizationId,
      productId: body.productId,
      receipts: body.receipts === undefined ? facts.receipts : body.receipts,
      allocations: this.allocations,
      corrections: this.corrections,
    });
    if (this.allocations.some((item) => item.id === body.id && item.organizationId === gate.organizationId)) {
      return { ok: false, reason: 'conflict', conflict: 'id_exists', officialStock: false };
    }

    const decision = decideAllocation(
      {
        id: body.id,
        organizationId: gate.organizationId,
        productId: body.productId,
        quantity: body.quantity,
        orderLineId: body.orderLineId,
        orderLineOrganizationId: gate.organizationId,
        allocatedAt: body.allocatedAt,
        recordedAt: body.recordedAt,
        actorMemberId: gate.memberId,
        actorLabel: gate.actorLabel,
        source: ORDER_ALLOCATION_SOURCE,
        finishedGoodsReceiptId: body.finishedGoodsReceiptId ?? null,
        finishedGoodsReceiptOrganizationId: receiptTenant,
        knownAvailableQuantity: availability.known ? availability.availableQuantity : null,
        receipts: null,
        idempotencyKey: body.idempotencyKey ?? null,
      },
      [],
    );
    if (!decision.ok) return decision;
    this.allocations.push(structuredClone(decision.allocation));
    return { ok: true, allocation: structuredClone(decision.allocation) };
  }

  correct(
    session: WarehouseActorSession | null,
    body: CorrectBody,
  ): { ok: true; correction: WarehouseAllocationCorrection; allocation: OrderAllocation } | WarehouseDenial | { ok: false; reason: 'not_found' | 'exceeds_allocated' | 'invalid'; officialStock: false } {
    const gate = requireAllocator(session, body.organizationId);
    if (!gate.ok) return gate;
    const allocation = this.allocations.find(
      (item) => item.id === body.allocationId && item.organizationId === gate.organizationId,
    );
    if (!allocation) return { ok: false, reason: 'not_found', officialStock: false };
    const reason = body.reason.trim();
    if (!reason) return { ok: false, reason: 'invalid', officialStock: false };
    const already = netAllocatedQuantity(
      [allocation],
      this.corrections,
      gate.organizationId,
      () => true,
    );
    const requested = body.quantity.trim();
    let requestedScaled: bigint;
    try {
      requestedScaled = parsePositive(requested);
    } catch {
      return { ok: false, reason: 'exceeds_allocated', officialStock: false };
    }
    if (requestedScaled > parsePositive(already)) {
      return { ok: false, reason: 'exceeds_allocated', officialStock: false };
    }
    const correction: WarehouseAllocationCorrection = {
      id: body.id,
      organizationId: gate.organizationId,
      allocationId: allocation.id,
      quantity: requested,
      actorMemberId: gate.memberId,
      actorLabel: gate.actorLabel,
      reason,
      correctedAt: body.correctedAt,
      recordedAt: body.recordedAt,
      deletesAllocation: false,
    };
    this.corrections.push(correction);
    return {
      ok: true,
      correction: structuredClone(correction),
      allocation: structuredClone(allocation),
    };
  }

  suggestPedidos(
    session: WarehouseActorSession | null,
    query: string,
    candidates: readonly WarehousePedidoFact[],
  ): { ok: true; suggestions: WarehousePedidoOption[] } | WarehouseDenial {
    const gate = requireAllocator(session, null);
    if (!gate.ok) return gate;
    return {
      ok: true,
      suggestions: suggestSameTenantPedidos({
        organizationId: gate.organizationId,
        query,
        candidates,
      }),
    };
  }

  remainingAggregate(
    session: WarehouseActorSession | null,
    facts: WarehouseFacts,
  ): WarehouseRemainingAggregate | WarehouseDenial {
    const gate = requireAllocator(session, null);
    if (!gate.ok) return gate;
    const productIds = new Set<string>();
    for (const receipt of facts.receipts ?? []) {
      if (receipt.organizationId === gate.organizationId) productIds.add(receipt.productId);
    }
    for (const allocation of this.allocations) {
      if (allocation.organizationId === gate.organizationId) productIds.add(allocation.productId);
    }
    for (const pedido of facts.pedidos) {
      if (pedido.organizationId === gate.organizationId) productIds.add(pedido.productId);
    }
    return {
      ok: true,
      organizationId: gate.organizationId,
      officialStock: false,
      byProduct: [...productIds].sort().map((productId) => {
        const availability = projectSameTenantAvailability({
          organizationId: gate.organizationId,
          productId,
          receipts: facts.receipts,
          allocations: this.allocations,
          corrections: this.corrections,
        });
        return {
          productId,
          availableQuantity: availability.availableQuantity,
          receiptQuantity: availability.receiptQuantity,
          officialStock: false as const,
        };
      }),
      byLine: facts.pedidos
        .filter((pedido) => pedido.organizationId === gate.organizationId)
        .map((pedido) => remainForPedido(pedido, this.allocations, this.corrections)),
    };
  }

  getAllocation(session: WarehouseActorSession | null, id: string): OrderAllocation | null {
    const organizationId = sessionOrganizationId(session);
    if (!organizationId) return null;
    const found = this.allocations.find((item) => item.id === id && item.organizationId === organizationId);
    return found ? structuredClone(found) : null;
  }

  listAllocations(session: WarehouseActorSession | null): OrderAllocation[] {
    const organizationId = sessionOrganizationId(session);
    if (!organizationId) return [];
    return this.allocations
      .filter((item) => item.organizationId === organizationId)
      .map((item) => structuredClone(item));
  }

  listCorrections(session: WarehouseActorSession | null): WarehouseAllocationCorrection[] {
    const organizationId = sessionOrganizationId(session);
    if (!organizationId) return [];
    return this.corrections
      .filter((item) => item.organizationId === organizationId)
      .map((item) => structuredClone(item));
  }

  view(session: WarehouseActorSession | null, facts: WarehouseFacts): WarehouseTaskView | WarehouseDenial {
    const organizationId = sessionOrganizationId(session);
    if (!organizationId || session?.accessStatus !== 'active') return denied('no_session_org');
    return buildWarehouseTaskView({
      organizationId,
      receipts: facts.receipts,
      pedidos: facts.pedidos,
      allocations: this.allocations,
      corrections: this.corrections,
    });
  }
}

function requireAllocator(
  session: WarehouseActorSession | null,
  bodyOrganizationId: string | null | undefined,
): { ok: true; organizationId: string; memberId: string; actorLabel: string } | WarehouseDenial {
  const organizationId = sessionOrganizationId(session);
  if (!organizationId || session?.accessStatus !== 'active') return denied('no_session_org');
  if (bodyOrganizationId?.trim() && bodyOrganizationId.trim() !== organizationId) {
    return denied('cross_tenant');
  }
  if (session?.grantedScopes == null) return denied('permission_unconfirmed');
  if (!canAllocateFinishedGoods(session)) return denied('unauthorized_role');
  const memberId = session.memberId?.trim() ?? '';
  if (!memberId) return denied('no_session_org');
  const actorLabel = session.actorLabel?.trim() || WAREHOUSE_MISSING_NAME;
  return { ok: true, organizationId, memberId, actorLabel };
}

function denied(reason: WarehouseDenialReason): WarehouseDenial {
  return { ok: false, reason, officialStock: false };
}

function parsePositive(value: string): bigint {
  const parsed = parseQuantity(value);
  if (parsed <= BigInt(0)) throw new Error('Quantity must be greater than zero');
  return parsed;
}
