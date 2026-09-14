import { canRecordPurchasing, PURCHASING_OPERATIONAL_RECORD_SCOPE } from '../../os-contracts/src/operations-scopes';
import {
  changePurchaseRequestStatus,
  type ChangePurchaseRequestStatusInput,
  type PurchaseRequest,
  type PurchaseRequestAccessFailure,
  type PurchaseRequestFailure,
  type PurchaseRequestSession,
} from '../../os-contracts/src/purchase-request';

/**
 * Trusted-session purchase request transition.
 *
 * purchasing.operational.record is this mutation's exact capability. It is not
 * a universal read, and it is not granted by Auxiliar, cargo, title, or
 * operations.coordinator.record.
 *
 * The target organization must equal the trusted session organization before
 * changePurchaseRequestStatus runs. A foreign id is the same as missing: no
 * mutation, no success event, no existence leak.
 *
 * Live persistence is UNPROVEN. This module has no Prisma writer.
 */
export const PURCHASE_REQUEST_LIVE_WRITE_PROOF = 'UNPROVEN' as const;

export const PURCHASE_REQUEST_TRANSITION_CAPABILITY = PURCHASING_OPERATIONAL_RECORD_SCOPE;

export const PURCHASE_REQUEST_STATUS_CHANGED = 'purchase_request.status_changed' as const;

export type PurchaseRequestTransitionEvent = {
  kind: typeof PURCHASE_REQUEST_STATUS_CHANGED;
  organizationId: string;
  requestId: string;
  fromStatus: PurchaseRequest['status'];
  toStatus: PurchaseRequest['status'];
};

export type PurchaseRequestTransitionFailure =
  | PurchaseRequestAccessFailure
  | 'not_found'
  | PurchaseRequestFailure;

export type PurchaseRequestTransitionResult =
  | {
      ok: true;
      request: PurchaseRequest;
      event: PurchaseRequestTransitionEvent;
      liveWrite: typeof PURCHASE_REQUEST_LIVE_WRITE_PROOF;
    }
  | {
      ok: false;
      reason: PurchaseRequestTransitionFailure;
      event: null;
      liveWrite: typeof PURCHASE_REQUEST_LIVE_WRITE_PROOF;
    };

function denied(reason: PurchaseRequestTransitionFailure): PurchaseRequestTransitionResult {
  return {
    ok: false,
    reason,
    event: null,
    liveWrite: PURCHASE_REQUEST_LIVE_WRITE_PROOF,
  };
}

function organizationId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Both sides must be present and equal. A missing organization is not a match
 * and is not a fallback to the other side.
 */
export function purchaseRequestTargetMatchesSession(
  sessionOrganizationId: string | null | undefined,
  targetOrganizationId: string | null | undefined,
): boolean {
  const session = organizationId(sessionOrganizationId);
  const target = organizationId(targetOrganizationId);
  return session != null && target != null && session === target;
}

/** Record scope authorizes this mutation only. It does not authorize a universal read. */
export function purchasingOperationalRecordAuthorizesUniversalRead(): false {
  return false;
}

function holdsTransitionCapability(session: PurchaseRequestSession): boolean {
  return canRecordPurchasing(session.grantedScopes ?? []);
}

/**
 * Session organization and the exact record capability, before any row is loaded.
 * A claimed target organization that is not the session organization is
 * cross-tenant and does not inspect the id.
 */
export function authorizePurchaseRequestTransition(
  session: PurchaseRequestSession | null | undefined,
  targetOrganizationId?: string | null,
): { ok: true; organizationId: string } | { ok: false; reason: PurchaseRequestAccessFailure } {
  const sessionOrganization = organizationId(session?.organizationId);
  if (!session || !sessionOrganization) return { ok: false, reason: 'session_org_required' };
  const claimed = organizationId(targetOrganizationId);
  if (claimed && !purchaseRequestTargetMatchesSession(sessionOrganization, claimed)) {
    return { ok: false, reason: 'cross_tenant' };
  }
  if (!holdsTransitionCapability(session)) return { ok: false, reason: 'unauthorized_role' };
  return { ok: true, organizationId: sessionOrganization };
}

/**
 * Proves the loaded request's organization equals the trusted session
 * organization, then transitions. A missing or foreign request is not_found
 * and does not produce a success event.
 */
export function transitionPurchaseRequest(input: {
  session: PurchaseRequestSession | null | undefined;
  request: PurchaseRequest | null | undefined;
  targetOrganizationId?: string | null;
  change: ChangePurchaseRequestStatusInput;
}): PurchaseRequestTransitionResult {
  const gate = authorizePurchaseRequestTransition(input.session, input.targetOrganizationId);
  if (!gate.ok) return denied(gate.reason);
  if (!input.request || !purchaseRequestTargetMatchesSession(gate.organizationId, input.request.organizationId)) {
    return denied('not_found');
  }

  const changed = changePurchaseRequestStatus(input.request, input.change);
  if (!changed.ok) return denied(changed.reason);
  if (!purchaseRequestTargetMatchesSession(gate.organizationId, changed.request.organizationId)) {
    return denied('not_found');
  }

  return {
    ok: true,
    request: changed.request,
    event: {
      kind: PURCHASE_REQUEST_STATUS_CHANGED,
      organizationId: gate.organizationId,
      requestId: changed.request.id,
      fromStatus: input.request.status,
      toStatus: changed.request.status,
    },
    liveWrite: PURCHASE_REQUEST_LIVE_WRITE_PROOF,
  };
}
