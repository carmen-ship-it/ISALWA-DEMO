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

/**
 * There is no database writer for AllocateFinishedGoods. An in-memory insert is
 * not live tenant proof.
 */
export const ALLOCATION_LIVE_WRITE = 'UNPROVEN' as const;

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

/**
 * Lookups must be keyed by the trusted session organization and the id.
 * An id-only finder is not accepted.
 */
export type AllocationTenantTargets = {
  orderLineInOrg(organizationId: string, orderLineId: string): TenantOwnedId | null | Promise<TenantOwnedId | null>;
  receiptInOrg(organizationId: string, receiptId: string): TenantOwnedId | null | Promise<TenantOwnedId | null>;
};

export type AllocateSessionDenial = {
  ok: false;
  reason: WarehouseDenialReason | 'not_found' | 'invalid';
  officialStock: false;
  liveWrite: typeof ALLOCATION_LIVE_WRITE;
};

export type AllocateSessionStoreDenial = (
  | MissingAvailability
  | ExceedsAvailable
  | CrossTenantAllocation
  | AllocationConflict
) & { liveWrite: typeof ALLOCATION_LIVE_WRITE };

export type AllocateSessionResult =
  | {
      ok: true;
      allocation: OrderAllocation;
      liveWrite: typeof ALLOCATION_LIVE_WRITE;
      tenantProof: 'in_memory_not_live';
    }
  | AllocateSessionDenial
  | AllocateSessionStoreDenial;

function denied(reason: AllocateSessionDenial['reason']): AllocateSessionDenial {
  return { ok: false, reason, officialStock: false, liveWrite: ALLOCATION_LIVE_WRITE };
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
  store: InMemoryOrderAllocationStore,
  session: AllocationSession | null | undefined,
  body: unknown,
  targets: AllocationTenantTargets,
): Promise<AllocateSessionResult> {
  const organizationId = sessionOrganizationId(session);
  if (!organizationId || session?.accessStatus !== 'active') return denied('no_session_org');
  const memberId = session?.actorMemberId?.trim() ?? '';
  if (!memberId) return denied('no_session_org');
  if (session?.grantedScopes == null) return denied('permission_unconfirmed');
  if (!canAllocateFinishedGoods(session)) return denied('unauthorized_role');

  const draft = asRecord(body);
  if (!draft) return denied('invalid');
  const bodyOrg = text(draft.organizationId);
  const lineOrg = text(draft.orderLineOrganizationId);
  const receiptOrg = text(draft.finishedGoodsReceiptOrganizationId);
  if ((bodyOrg && bodyOrg !== organizationId) || (lineOrg && lineOrg !== organizationId) || (receiptOrg && receiptOrg !== organizationId)) {
    return denied('cross_tenant');
  }
  const bodyActor = text(draft.actorMemberId);
  if (bodyActor && bodyActor !== memberId) return denied('unauthorized_role');

  const orderLineId = text(draft.orderLineId);
  if (!orderLineId) return denied('not_found');
  const line = await targets.orderLineInOrg(organizationId, orderLineId);
  if (!ownedBySession(organizationId, line, orderLineId)) return denied('not_found');

  const receiptId = text(draft.finishedGoodsReceiptId);
  if (receiptId) {
    const receipt = await targets.receiptInOrg(organizationId, receiptId);
    if (!ownedBySession(organizationId, receipt, receiptId)) return denied('not_found');
  }

  const priorId = text(draft.id);
  if (priorId && store.get(organizationId, priorId)) {
    return { ok: false, reason: 'conflict', conflict: 'id_exists', officialStock: false, liveWrite: ALLOCATION_LIVE_WRITE };
  }

  let saved: AllocateFinishedGoodsResult;
  try {
    saved = store.allocate({
      ...draft,
      organizationId,
      orderLineOrganizationId: organizationId,
      finishedGoodsReceiptOrganizationId: receiptId ? organizationId : null,
      actorMemberId: memberId,
      actorLabel: text(draft.actorLabel) || session?.actorLabel?.trim() || 'El nombre no fue registrado',
    });
  } catch {
    return denied('invalid');
  }
  if (!saved.ok) return { ...saved, liveWrite: ALLOCATION_LIVE_WRITE };
  if (saved.allocation.organizationId !== organizationId) return denied('not_found');
  return {
    ok: true,
    allocation: saved.allocation,
    liveWrite: ALLOCATION_LIVE_WRITE,
    tenantProof: 'in_memory_not_live',
  };
}

