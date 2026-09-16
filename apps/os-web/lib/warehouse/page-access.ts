import type { OrderAllocation } from '@isalwa/os-contracts';
import {
  buildWarehouseTaskView,
  canAllocateFinishedGoods,
  canReceiveFinishedGoods,
  sessionOrganizationId,
  type WarehouseAllocationCorrection,
  type WarehouseDenialReason,
  type WarehouseTaskView,
} from '@isalwa/os-contracts';
import type { WarehouseActorSession, WarehouseFacts } from './desk';

export type WarehousePageAccess =
  | {
      status: 'denied';
      reason: WarehouseDenialReason;
      view: null;
      canAllocate: false;
      canReceive: false;
    }
  | {
      status: 'ready';
      reason: null;
      view: WarehouseTaskView;
      canAllocate: boolean;
      canReceive: boolean;
    };

/**
 * Session organization is the only tenant. A missing scope list is not a grant.
 * Receive and allocate stay distinct — either unlocks the desk read/context.
 */
export function resolveWarehousePageAccess(input: {
  session: WarehouseActorSession | null;
  grantedScopes: readonly string[] | null;
  facts?: WarehouseFacts;
  allocations?: readonly OrderAllocation[];
  corrections?: readonly WarehouseAllocationCorrection[];
}): WarehousePageAccess {
  const organizationId = sessionOrganizationId(input.session);
  if (!organizationId || input.session?.accessStatus !== 'active') {
    return {
      status: 'denied',
      reason: 'no_session_org',
      view: null,
      canAllocate: false,
      canReceive: false,
    };
  }
  if (input.grantedScopes === null) {
    return {
      status: 'denied',
      reason: 'permission_unconfirmed',
      view: null,
      canAllocate: false,
      canReceive: false,
    };
  }
  const canAllocate = canAllocateFinishedGoods({
    ...input.session,
    grantedScopes: input.grantedScopes,
  });
  const canReceive = canReceiveFinishedGoods(input.grantedScopes);
  if (!canAllocate && !canReceive) {
    return {
      status: 'denied',
      reason: 'unauthorized_role',
      view: null,
      canAllocate: false,
      canReceive: false,
    };
  }
  const facts = input.facts ?? { receipts: null, pedidos: [] };
  return {
    status: 'ready',
    reason: null,
    canAllocate,
    canReceive,
    view: buildWarehouseTaskView({
      organizationId,
      receipts: facts.receipts,
      pedidos: facts.pedidos,
      allocations: input.allocations ?? [],
      corrections: input.corrections ?? [],
    }),
  };
}
