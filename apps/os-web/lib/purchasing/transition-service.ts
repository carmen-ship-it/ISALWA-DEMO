import {
  isPurchaseRequestStatus,
  type PurchaseRequest,
  type PurchaseRequestSession,
  type PurchaseRequestStatus,
} from '@isalwa/os-contracts';
import {
  PURCHASE_REQUEST_LIVE_WRITE_PROOF,
  transitionPurchaseRequest,
  type PurchaseRequestTransitionFailure,
} from '@isalwa/os-purchasing';

/**
 * Applies Avanzar / Detener to the process-local Compras queue.
 * Hosted Prisma write remains UNPROVEN (os-purchasing has no live writer).
 * No OC, stock, reorder, or ledger fields.
 */
export type ComprasTransitionOutcome =
  | {
      ok: true;
      request: PurchaseRequest;
      liveWrite: typeof PURCHASE_REQUEST_LIVE_WRITE_PROOF;
    }
  | {
      ok: false;
      reason: PurchaseRequestTransitionFailure;
      liveWrite: typeof PURCHASE_REQUEST_LIVE_WRITE_PROOF;
    };

export function findTenantPurchaseRequest(
  requests: readonly PurchaseRequest[],
  organizationId: string,
  requestId: string,
): PurchaseRequest | null {
  const id = requestId.trim();
  const org = organizationId.trim();
  if (!id || !org) return null;
  return requests.find((row) => row.organizationId === org && row.id === id) ?? null;
}

export function applyPurchaseRequestStatusChange(input: {
  session: PurchaseRequestSession | null | undefined;
  requests: readonly PurchaseRequest[];
  requestId: string;
  status: string;
  at: string;
  actorLabel: string;
  actorMemberId?: string | null;
  statusEntryId: string;
  note?: string | null;
  buyerLabel?: string | null;
}): ComprasTransitionOutcome {
  const organizationId = input.session?.organizationId?.trim() ?? '';
  const request = findTenantPurchaseRequest(input.requests, organizationId, input.requestId);
  if (!isPurchaseRequestStatus(input.status)) {
    return { ok: false, reason: 'invalid_status', liveWrite: PURCHASE_REQUEST_LIVE_WRITE_PROOF };
  }

  const result = transitionPurchaseRequest({
    session: input.session,
    request,
    targetOrganizationId: organizationId || undefined,
    change: {
      status: input.status as PurchaseRequestStatus,
      at: input.at,
      actorLabel: input.actorLabel,
      actorMemberId: input.actorMemberId ?? null,
      statusEntryId: input.statusEntryId,
      note: input.note ?? null,
      buyerLabel: input.buyerLabel ?? null,
    },
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason, liveWrite: result.liveWrite };
  }
  return { ok: true, request: result.request, liveWrite: result.liveWrite };
}
