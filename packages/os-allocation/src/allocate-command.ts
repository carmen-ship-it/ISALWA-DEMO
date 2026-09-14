import {
  canAllocateFinishedGoods,
  sessionOrganizationId,
  type WarehouseDenialReason,
} from '../../os-contracts/src/warehouse-task';
import type {
  AllocateFinishedGoodsResult,
  AllocationConflict,
  CrossTenantAllocation,
  ExceedsAvailable,
  MissingAvailability,
  OrderAllocation,
} from '../../os-contracts/src/order-allocation';
import { InMemoryOrderAllocationStore } from './store';
import {
  ALLOCATION_PRISMA_LIVE_WRITE,
  type PrismaOrderAllocationStore,
} from './prisma-store';

/** Memory path remains UNPROVEN for live tenant proof. */
export const ALLOCATION_LIVE_WRITE = 'UNPROVEN' as const;

export type AllocationLiveWrite =
  | typeof ALLOCATION_LIVE_WRITE
  | typeof ALLOCATION_PRISMA_LIVE_WRITE;

export type AllocationSession = {
  organizationId?: string | null;
  actorMemberId?: string | null;
  actorLabel?: string | null;
  accessStatus?: string | null;
  grantedScopes?: readonly string[] | null;
};

export type TenantOwnedId = {
  organizationId: string;
  id: string;
};

export type AllocationTenantTargets = {
  orderLineInOrg(organizationId: string, orderLineId: string): TenantOwnedId | null | Promise<TenantOwnedId | null>;
  receiptInOrg(organizationId: string, receiptId: string): TenantOwnedId | null | Promise<TenantOwnedId | null>;
};

export type OrderAllocationWriteStore = {
  get(organizationId: string, id: string): OrderAllocation | null | Promise<OrderAllocation | null>;
  allocate(input: unknown): AllocateFinishedGoodsResult | Promise<AllocateFinishedGoodsResult>;
  liveWrite?: AllocationLiveWrite;
};

export type OrderAllocationStoreLike = OrderAllocationWriteStore;

export type AllocateSessionDenial = {
  ok: false;
  reason: WarehouseDenialReason | 'not_found' | 'invalid';
  officialStock: false;
  liveWrite: AllocationLiveWrite;
};

export type AllocateSessionStoreDenial = (
  | MissingAvailability
  | ExceedsAvailable
  | CrossTenantAllocation
  | AllocationConflict
) & { liveWrite: AllocationLiveWrite };

export type AllocateSessionResult =
  | {
      ok: true;
      allocation: OrderAllocation;
      liveWrite: AllocationLiveWrite;
      tenantProof: 'in_memory_not_live' | 'prisma_port';
      migrationApplied: false;
    }
  | AllocateSessionDenial
  | AllocateSessionStoreDenial;

function liveOf(store: OrderAllocationWriteStore): AllocationLiveWrite {
  return store.liveWrite ?? ALLOCATION_LIVE_WRITE;
}

function denied(
  reason: AllocateSessionDenial['reason'],
  liveWrite: AllocationLiveWrite = ALLOCATION_LIVE_WRITE,
): AllocateSessionDenial {
  return { ok: false, reason, officialStock: false, liveWrite };
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  return input as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function ownedBySession(sessionOrgId: string, row: TenantOwnedId | null, id: string): boolean {
  return row !== null && row.organizationId === sessionOrgId && row.id === id;
}

/**
 * Allocate only after the trusted session organization owns the order line,
 * and the receipt when one is cited. Receive, delivery.record, and
 * commercial.team.read do not authorize this write.
 */
export async function allocateFinishedGoodsForSession(
  store: InMemoryOrderAllocationStore | PrismaOrderAllocationStore | OrderAllocationWriteStore,
  session: AllocationSession | null | undefined,
  body: unknown,
  targets: AllocationTenantTargets,
): Promise<AllocateSessionResult> {
  const liveWrite = liveOf(store as OrderAllocationWriteStore);
  const organizationId = sessionOrganizationId(session);
  if (!organizationId || session?.accessStatus !== 'active') return denied('no_session_org', liveWrite);
  const memberId = session?.actorMemberId?.trim() ?? '';
  if (!memberId) return denied('no_session_org', liveWrite);
  if (session?.grantedScopes == null) return denied('permission_unconfirmed', liveWrite);
  if (!canAllocateFinishedGoods(session)) return denied('unauthorized_role', liveWrite);

  const draft = asRecord(body);
  if (!draft) return denied('invalid', liveWrite);
  const bodyOrg = text(draft.organizationId);
  const lineOrg = text(draft.orderLineOrganizationId);
  const receiptOrg = text(draft.finishedGoodsReceiptOrganizationId);
  if ((bodyOrg && bodyOrg !== organizationId) || (lineOrg && lineOrg !== organizationId) || (receiptOrg && receiptOrg !== organizationId)) {
    return denied('cross_tenant', liveWrite);
  }
  const bodyActor = text(draft.actorMemberId);
  if (bodyActor && bodyActor !== memberId) return denied('unauthorized_role', liveWrite);

  const orderLineId = text(draft.orderLineId);
  if (!orderLineId) return denied('not_found', liveWrite);
  const line = await targets.orderLineInOrg(organizationId, orderLineId);
  if (!ownedBySession(organizationId, line, orderLineId)) return denied('not_found', liveWrite);

  const receiptId = text(draft.finishedGoodsReceiptId);
  if (receiptId) {
    const receipt = await targets.receiptInOrg(organizationId, receiptId);
    if (!ownedBySession(organizationId, receipt, receiptId)) return denied('not_found', liveWrite);
  }

  const priorId = text(draft.id);
  if (priorId) {
    const prior = await store.get(organizationId, priorId);
    if (prior) {
      return { ok: false, reason: 'conflict', conflict: 'id_exists', officialStock: false, liveWrite };
    }
  }

  let saved: AllocateFinishedGoodsResult;
  try {
    saved = await store.allocate({
      ...draft,
      organizationId,
      orderLineOrganizationId: organizationId,
      finishedGoodsReceiptOrganizationId: receiptId ? organizationId : null,
      actorMemberId: memberId,
      actorLabel: text(draft.actorLabel) || session?.actorLabel?.trim() || 'El nombre no fue registrado',
    });
  } catch {
    return denied('invalid', liveWrite);
  }
  if (!saved.ok) return { ...saved, liveWrite };
  if (saved.allocation.organizationId !== organizationId) return denied('not_found', liveWrite);
  return {
    ok: true,
    allocation: saved.allocation,
    liveWrite,
    tenantProof: liveWrite === ALLOCATION_PRISMA_LIVE_WRITE ? 'prisma_port' : 'in_memory_not_live',
    migrationApplied: false,
  };
}
