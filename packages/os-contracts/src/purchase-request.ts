import { z } from 'zod';
import { canRecordPurchasing } from './operations-scopes';

/**
 * A purchase request is a message from a responsible area to the buyer.
 * The encargada de compras buys. This is not inventory and not an ERP ledger.
 *
 * A request does not prove there is no stock, does not open a reorder,
 * and does not create a supplier as an accounting party.
 * Quantity and a production or order link are stored only when the area provided them.
 *
 * Stored status ids: solicitado, cotizandose, pedido_preparandose, entregado, cancelled.
 * cancelled is a stop for a mistaken request, not a happy-path step.
 * Legacy keys map forward. They are not stored again.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts.
 * Do not register it as inventory, purchasing ERP, or approval-threshold policy.
 * schema.prisma and the 20260915180000 migration stay as they are.
 */

export const PURCHASE_REQUEST_STATUSES = [
  'solicitado',
  'cotizandose',
  'pedido_preparandose',
  'entregado',
  'cancelled',
] as const;
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

/** Happy path. Cancelado is not a step on this path. */
export const PURCHASE_REQUEST_HAPPY_PATH = [
  'solicitado',
  'cotizandose',
  'pedido_preparandose',
  'entregado',
] as const;

/**
 * Existing keys map forward. cancelled stays a stop.
 * requested -> solicitado, in_progress -> cotizandose, received -> entregado.
 */
export const LEGACY_PURCHASE_REQUEST_STATUS_MAP = {
  requested: 'solicitado',
  in_progress: 'cotizandose',
  received: 'entregado',
  cancelled: 'cancelled',
} as const;

/** Display labels. Never store these as status ids. Isa's words, exact. */
export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  solicitado: 'Solicitado',
  cotizandose: 'Cotizándose',
  pedido_preparandose: 'Pedido y Preparándose',
  entregado: 'Entregado',
  cancelled: 'Cancelado',
};

/** Next happy-path label. The stop is not a next action. */
export const PURCHASE_REQUEST_NEXT_ACTION_LABELS: Record<
  PurchaseRequestStatus,
  string | null
> = {
  solicitado: 'Cotizándose',
  cotizandose: 'Pedido y Preparándose',
  pedido_preparandose: 'Entregado',
  entregado: null,
  cancelled: null,
};

export const PURCHASE_REQUEST_ROLES = ['requester', 'buyer'] as const;
export type PurchaseRequestRole = (typeof PURCHASE_REQUEST_ROLES)[number];

export const PURCHASE_REQUEST_SOURCE = 'manual' as const;
/**
 * not_official means this row is not a stock authority.
 * It does not mean stock is zero.
 */
export const PURCHASE_REQUEST_STOCK_AUTHORITY = 'not_official' as const;
/** This record never creates a follow-on purchase. */
export const PURCHASE_REQUEST_REORDER_POLICY = 'none' as const;

export const PURCHASE_REQUEST_BOUNDARY =
  'Un pedido de compra no prueba que no haya stock. No es inventario y no genera una recompra automática.';

export const PURCHASE_REQUEST_TABLES = [
  'os_purchase_requests',
  'os_purchase_request_status_history',
  'os_purchase_request_notes',
] as const;

const NEXT_STATUS: Record<PurchaseRequestStatus, readonly PurchaseRequestStatus[]> = {
  solicitado: ['cotizandose', 'cancelled'],
  cotizandose: ['pedido_preparandose', 'cancelled'],
  pedido_preparandose: ['entregado', 'cancelled'],
  entregado: [],
  cancelled: [],
};

export type PurchaseRequestFailure =
  | 'id_required'
  | 'organization_required'
  | 'requesting_area_required'
  | 'requested_by_required'
  | 'description_required'
  | 'reason_required'
  | 'actor_required'
  | 'note_required'
  | 'entry_required'
  | 'invalid_time'
  | 'invalid_quantity'
  | 'invalid_status'
  | 'invalid_transition'
  | 'terminal'
  | 'already_exists'
  | 'forbidden_stock_claim'
  | 'forbidden_reorder'
  | 'forbidden_supplier_party'
  | 'forbidden_approval'
  | 'forbidden_ledger';

export type PurchaseRequestAccessFailure =
  | 'session_org_required'
  | 'unauthorized_role'
  | 'cross_tenant';

export type PurchaseRequestStatusEntry = {
  id: string;
  fromStatus: PurchaseRequestStatus | null;
  toStatus: PurchaseRequestStatus;
  at: string;
  actorLabel: string;
  actorMemberId: string | null;
  source: typeof PURCHASE_REQUEST_SOURCE;
  note: string | null;
};

export type PurchaseRequestNote = {
  id: string;
  body: string;
  at: string;
  actorLabel: string;
  actorMemberId: string | null;
  source: typeof PURCHASE_REQUEST_SOURCE;
  /** A human reference. Not a file store and not a stock reading. */
  evidenceReference: string | null;
};

export type PurchaseRequest = {
  id: string;
  organizationId: string;
  requestingArea: string;
  requestedByLabel: string;
  requestedByMemberId: string | null;
  description: string;
  quantity: string | null;
  unit: string | null;
  productionContextId: string | null;
  orderId: string | null;
  reason: string;
  requestedAt: string;
  status: PurchaseRequestStatus;
  buyerLabel: string | null;
  buyerMemberId: string | null;
  notes: PurchaseRequestNote[];
  statusHistory: PurchaseRequestStatusEntry[];
  actorLabel: string;
  actorMemberId: string | null;
  source: typeof PURCHASE_REQUEST_SOURCE;
  stockAuthority: typeof PURCHASE_REQUEST_STOCK_AUTHORITY;
  reorderPolicy: typeof PURCHASE_REQUEST_REORDER_POLICY;
  claimsOfficialStock: false;
  triggersReorder: false;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseRequestResult =
  | { ok: true; request: PurchaseRequest }
  | { ok: false; reason: PurchaseRequestFailure };

export type PurchaseRequestSession = {
  organizationId?: string | null;
  role?: string | null;
  grantedScopes?: readonly string[] | null;
  actorLabel?: string | null;
};

export type PurchaseBuyerCandidate = {
  organizationId: string;
  label: string;
  role: string;
};

export type PurchaseRequestQueueResult =
  | { ok: true; organizationId: string; requests: PurchaseRequest[]; count: number }
  | { ok: false; reason: PurchaseRequestAccessFailure };

export type PurchaseRequestCountResult =
  | { ok: true; count: number }
  | { ok: false; reason: PurchaseRequestAccessFailure };

export type PurchaseRequestSearchResult =
  | { ok: true; requests: PurchaseRequest[] }
  | { ok: false; reason: PurchaseRequestAccessFailure };

export type PurchaseBuyerSuggestionResult =
  | { ok: true; labels: string[] }
  | { ok: false; reason: PurchaseRequestAccessFailure };

const FORBIDDEN_INPUT_KEYS: Record<string, PurchaseRequestFailure> = {
  stockOnHand: 'forbidden_stock_claim',
  stockQuantity: 'forbidden_stock_claim',
  officialStock: 'forbidden_stock_claim',
  officialStockStatus: 'forbidden_stock_claim',
  shortage: 'forbidden_stock_claim',
  stockShortage: 'forbidden_stock_claim',
  outOfStock: 'forbidden_stock_claim',
  claimsOfficialStock: 'forbidden_stock_claim',
  reorderPoint: 'forbidden_reorder',
  reorderQuantity: 'forbidden_reorder',
  automaticReorder: 'forbidden_reorder',
  triggersReorder: 'forbidden_reorder',
  supplierPartyId: 'forbidden_supplier_party',
  supplierId: 'forbidden_supplier_party',
  approvalThreshold: 'forbidden_approval',
  approvalStatus: 'forbidden_approval',
  poNumber: 'forbidden_ledger',
  purchaseOrderNumber: 'forbidden_ledger',
  erpStatus: 'forbidden_ledger',
  ledgerEntryId: 'forbidden_ledger',
};

const optionalId = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const optionalQuantity = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .trim()
    .regex(/^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
);

const IsoDateTime = z.string().datetime();

function requiredText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function fail(reason: PurchaseRequestFailure): PurchaseRequestResult {
  return { ok: false, reason };
}

function rejectForbidden(input: object): PurchaseRequestFailure | null {
  for (const [key, reason] of Object.entries(FORBIDDEN_INPUT_KEYS)) {
    if (key in input && (input as Record<string, unknown>)[key] != null) {
      return reason;
    }
  }
  const source = (input as { source?: unknown }).source;
  if (source == null || source === PURCHASE_REQUEST_SOURCE) return null;
  if (source === 'reorder' || source === 'automatic' || source === 'system') {
    return 'forbidden_reorder';
  }
  if (source === 'stock' || source === 'shortage' || source === 'inventory') {
    return 'forbidden_stock_claim';
  }
  return 'invalid_status';
}

function parseTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parsed = IsoDateTime.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function mapLegacyPurchaseRequestStatus(value: string): PurchaseRequestStatus | null {
  if (isPurchaseRequestStatus(value)) return value;
  if (value === 'requested' || value === 'in_progress' || value === 'received') {
    return LEGACY_PURCHASE_REQUEST_STATUS_MAP[value];
  }
  return null;
}

export function purchaseRequestStatusLabel(status: PurchaseRequestStatus): string {
  return PURCHASE_REQUEST_STATUS_LABELS[status];
}

export function purchaseRequestDisplayStatusLabel(status: string): string | null {
  const mapped = mapLegacyPurchaseRequestStatus(status);
  return mapped ? PURCHASE_REQUEST_STATUS_LABELS[mapped] : null;
}

export function isPurchaseRequestStatus(value: string): value is PurchaseRequestStatus {
  return (PURCHASE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isPurchaseRequestRole(value: string): value is PurchaseRequestRole {
  return (PURCHASE_REQUEST_ROLES as readonly string[]).includes(value);
}

/** Cargo and title never grant this. Only an assigned purchasing role or scope. */
export function purchaseRequestRoleAllowsQueue(input: {
  role?: string | null;
  grantedScopes?: readonly string[] | null;
}): boolean {
  const role = input.role?.trim() ?? '';
  if (isPurchaseRequestRole(role)) return true;
  return canRecordPurchasing(input.grantedScopes ?? []);
}

/**
 * Session organization is required. A missing org is denied before any row is read.
 * A different target organization is cross-tenant, even for an allowed role.
 * A same-tenant actor without the purchasing role is denied. system.admin does not imply it.
 */
export function authorizePurchaseRequestRead(
  session: PurchaseRequestSession | null | undefined,
  targetOrganizationId?: string | null,
): { ok: true; organizationId: string } | { ok: false; reason: PurchaseRequestAccessFailure } {
  const organizationId = session?.organizationId?.trim() ?? '';
  if (!session || !organizationId) return { ok: false, reason: 'session_org_required' };
  const target = targetOrganizationId?.trim() ?? '';
  if (target && target !== organizationId) return { ok: false, reason: 'cross_tenant' };
  if (
    !purchaseRequestRoleAllowsQueue({
      role: session.role,
      grantedScopes: session.grantedScopes,
    })
  ) {
    return { ok: false, reason: 'unauthorized_role' };
  }
  return { ok: true, organizationId };
}

function sameTenant(
  requests: readonly PurchaseRequest[],
  organizationId: string,
): PurchaseRequest[] {
  return requests.filter((request) => request.organizationId === organizationId).map(cloneRequest);
}

function textMatches(value: string | null | undefined, needle: string): boolean {
  return Boolean(value && value.toLocaleLowerCase('es').includes(needle));
}

function requestMatches(request: PurchaseRequest, needle: string): boolean {
  if (!needle) return true;
  if (textMatches(request.description, needle)) return true;
  if (textMatches(request.requestingArea, needle)) return true;
  if (textMatches(request.requestedByLabel, needle)) return true;
  if (textMatches(request.buyerLabel, needle)) return true;
  if (textMatches(request.reason, needle)) return true;
  return request.notes.some(
    (note) => textMatches(note.body, needle) || textMatches(note.evidenceReference, needle),
  );
}

/** Own-tenant queue only. Denial carries no rows and no count. */
export function readPurchaseRequestQueue(
  session: PurchaseRequestSession | null | undefined,
  requests: readonly PurchaseRequest[],
  targetOrganizationId?: string | null,
): PurchaseRequestQueueResult {
  const access = authorizePurchaseRequestRead(session, targetOrganizationId);
  if (!access.ok) return { ok: false, reason: access.reason };
  const own = sameTenant(requests, access.organizationId);
  return { ok: true, organizationId: access.organizationId, requests: own, count: own.length };
}

/** Search never returns another tenant, even when the query matches their request. */
export function searchPurchaseRequests(
  session: PurchaseRequestSession | null | undefined,
  requests: readonly PurchaseRequest[],
  query: string,
  targetOrganizationId?: string | null,
): PurchaseRequestSearchResult {
  const access = authorizePurchaseRequestRead(session, targetOrganizationId);
  if (!access.ok) return { ok: false, reason: access.reason };
  const needle = query.trim().toLocaleLowerCase('es');
  const own = sameTenant(requests, access.organizationId).filter((request) =>
    requestMatches(request, needle),
  );
  return { ok: true, requests: own };
}

/** Count is the session tenant only. Denial does not include a number. */
export function countPurchaseRequests(
  session: PurchaseRequestSession | null | undefined,
  requests: readonly PurchaseRequest[],
  targetOrganizationId?: string | null,
): PurchaseRequestCountResult {
  const access = authorizePurchaseRequestRead(session, targetOrganizationId);
  if (!access.ok) return { ok: false, reason: access.reason };
  return {
    ok: true,
    count: requests.filter((request) => request.organizationId === access.organizationId).length,
  };
}

/**
 * Buyer names come only from same-tenant buyers.
 * A requester from another tenant is never named, even when the query matches.
 */
export function suggestPurchaseBuyers(
  session: PurchaseRequestSession | null | undefined,
  candidates: readonly PurchaseBuyerCandidate[],
  query: string,
  targetOrganizationId?: string | null,
): PurchaseBuyerSuggestionResult {
  const access = authorizePurchaseRequestRead(session, targetOrganizationId);
  if (!access.ok) return { ok: false, reason: access.reason };
  const needle = query.trim().toLocaleLowerCase('es');
  if (!needle) return { ok: true, labels: [] };
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.organizationId !== access.organizationId) continue;
    if (candidate.role !== 'buyer') continue;
    const label = candidate.label.trim();
    if (!label || !label.toLocaleLowerCase('es').includes(needle)) continue;
    const key = label.toLocaleLowerCase('es');
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return { ok: true, labels };
}

/** A purchase request is never an official stock reading. */
export function purchaseRequestClaimsOfficialStock(_request?: PurchaseRequest): false {
  return false;
}

/** Receiving, cancelling, or opening a request never creates another request. */
export function purchaseRequestTriggersReorder(_request?: PurchaseRequest): false {
  return false;
}

export function purchaseRequestMayPostInventory(): false {
  return false;
}

export function nextPurchaseRequestStatuses(
  status: PurchaseRequestStatus,
): readonly PurchaseRequestStatus[] {
  return NEXT_STATUS[status];
}

/** The single forward step. Cancelled is not returned here. */
export function purchaseRequestForwardStatus(
  status: PurchaseRequestStatus,
): PurchaseRequestStatus | null {
  return NEXT_STATUS[status].find((next) => next !== 'cancelled') ?? null;
}

export function purchaseRequestNextActionLabel(status: PurchaseRequestStatus): string | null {
  return PURCHASE_REQUEST_NEXT_ACTION_LABELS[status];
}

export type CreatePurchaseRequestInput = {
  id: string;
  organizationId: string;
  requestingArea: string;
  requestedByLabel: string;
  requestedByMemberId?: string | null;
  description: string;
  quantity?: string | null;
  unit?: string | null;
  productionContextId?: string | null;
  orderId?: string | null;
  reason: string;
  requestedAt: string;
  actorLabel?: string | null;
  actorMemberId?: string | null;
  statusEntryId: string;
  noteId?: string | null;
  note?: string | null;
  evidenceReference?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  source?: string | null;
};

export function createPurchaseRequest(input: CreatePurchaseRequestInput): PurchaseRequestResult {
  const forbidden = rejectForbidden(input);
  if (forbidden) return fail(forbidden);
  if ('status' in input && input.status != null && input.status !== 'solicitado') {
    return fail('invalid_status');
  }

  const id = requiredText(input.id);
  const organizationId = requiredText(input.organizationId);
  const requestingArea = requiredText(input.requestingArea);
  const requestedByLabel = requiredText(input.requestedByLabel);
  const description = requiredText(input.description);
  const reason = requiredText(input.reason);
  const statusEntryId = requiredText(input.statusEntryId);
  if (!id) return fail('id_required');
  if (!organizationId) return fail('organization_required');
  if (!requestingArea) return fail('requesting_area_required');
  if (!requestedByLabel) return fail('requested_by_required');
  if (!description) return fail('description_required');
  if (!reason) return fail('reason_required');
  if (!statusEntryId) return fail('entry_required');

  const requestedAt = parseTime(input.requestedAt);
  const createdAt = parseTime(input.createdAt);
  if (!requestedAt || !createdAt) return fail('invalid_time');

  const quantity = optionalQuantity.safeParse(input.quantity ?? null);
  if (!quantity.success) return fail('invalid_quantity');
  const unit = optionalId.safeParse(input.unit ?? null);
  const requestedByMemberId = optionalId.safeParse(input.requestedByMemberId ?? null);
  const productionContextId = optionalId.safeParse(input.productionContextId ?? null);
  const orderId = optionalId.safeParse(input.orderId ?? null);
  const actorMemberId = optionalId.safeParse(input.actorMemberId ?? null);
  const idempotencyKey = optionalId.safeParse(input.idempotencyKey ?? null);
  if (
    !unit.success ||
    !requestedByMemberId.success ||
    !productionContextId.success ||
    !orderId.success ||
    !actorMemberId.success ||
    !idempotencyKey.success
  ) {
    return fail('invalid_status');
  }

  const actorLabel = requiredText(input.actorLabel) ?? requestedByLabel;
  const notes: PurchaseRequestNote[] = [];
  const noteBody = requiredText(input.note);
  if (noteBody || requiredText(input.evidenceReference)) {
    const noteId = requiredText(input.noteId);
    if (!noteId || !noteBody) return fail('note_required');
    notes.push({
      id: noteId,
      body: noteBody,
      at: createdAt,
      actorLabel,
      actorMemberId: actorMemberId.data,
      source: PURCHASE_REQUEST_SOURCE,
      evidenceReference: requiredText(input.evidenceReference),
    });
  }

  const request: PurchaseRequest = {
    id,
    organizationId,
    requestingArea,
    requestedByLabel,
    requestedByMemberId: requestedByMemberId.data,
    description,
    quantity: quantity.data,
    unit: unit.data,
    productionContextId: productionContextId.data,
    orderId: orderId.data,
    reason,
    requestedAt,
    status: 'solicitado',
    buyerLabel: null,
    buyerMemberId: null,
    notes,
    statusHistory: [
      {
        id: statusEntryId,
        fromStatus: null,
        toStatus: 'solicitado',
        at: requestedAt,
        actorLabel,
        actorMemberId: actorMemberId.data,
        source: PURCHASE_REQUEST_SOURCE,
        note: null,
      },
    ],
    actorLabel,
    actorMemberId: actorMemberId.data,
    source: PURCHASE_REQUEST_SOURCE,
    stockAuthority: PURCHASE_REQUEST_STOCK_AUTHORITY,
    reorderPolicy: PURCHASE_REQUEST_REORDER_POLICY,
    claimsOfficialStock: false,
    triggersReorder: false,
    idempotencyKey: idempotencyKey.data,
    createdAt,
    updatedAt: createdAt,
  };
  return { ok: true, request };
}

export type ChangePurchaseRequestStatusInput = {
  status: string;
  at: string;
  actorLabel: string;
  actorMemberId?: string | null;
  statusEntryId: string;
  note?: string | null;
  buyerLabel?: string | null;
  buyerMemberId?: string | null;
  source?: string | null;
};

export function changePurchaseRequestStatus(
  request: PurchaseRequest,
  input: ChangePurchaseRequestStatusInput,
): PurchaseRequestResult {
  const forbidden = rejectForbidden(input);
  if (forbidden) return fail(forbidden);
  const current = mapLegacyPurchaseRequestStatus(request.status);
  if (!current) return fail('invalid_status');
  if (NEXT_STATUS[current].length === 0) return fail('terminal');
  if (!isPurchaseRequestStatus(input.status)) return fail('invalid_status');
  if (!NEXT_STATUS[current].includes(input.status)) return fail('invalid_transition');

  const at = parseTime(input.at);
  if (!at) return fail('invalid_time');
  const actorLabel = requiredText(input.actorLabel);
  const statusEntryId = requiredText(input.statusEntryId);
  if (!actorLabel) return fail('actor_required');
  if (!statusEntryId) return fail('entry_required');
  const actorMemberId = optionalId.safeParse(input.actorMemberId ?? null);
  const buyerLabel = optionalId.safeParse(input.buyerLabel ?? null);
  const buyerMemberId = optionalId.safeParse(input.buyerMemberId ?? null);
  if (!actorMemberId.success || !buyerLabel.success || !buyerMemberId.success) {
    return fail('invalid_status');
  }

  const entry: PurchaseRequestStatusEntry = {
    id: statusEntryId,
    fromStatus: current,
    toStatus: input.status,
    at,
    actorLabel,
    actorMemberId: actorMemberId.data,
    source: PURCHASE_REQUEST_SOURCE,
    note: requiredText(input.note),
  };

  return {
    ok: true,
    request: {
      ...request,
      status: input.status,
      buyerLabel: buyerLabel.data ?? request.buyerLabel,
      buyerMemberId: buyerMemberId.data ?? request.buyerMemberId,
      actorLabel,
      actorMemberId: actorMemberId.data,
      source: PURCHASE_REQUEST_SOURCE,
      stockAuthority: PURCHASE_REQUEST_STOCK_AUTHORITY,
      reorderPolicy: PURCHASE_REQUEST_REORDER_POLICY,
      claimsOfficialStock: false,
      triggersReorder: false,
      statusHistory: [...request.statusHistory.map((item) => ({ ...item })), entry],
      notes: request.notes.map((item) => ({ ...item })),
      updatedAt: at,
    },
  };
}

export type AddPurchaseRequestNoteInput = {
  noteId: string;
  body: string;
  at: string;
  actorLabel: string;
  actorMemberId?: string | null;
  evidenceReference?: string | null;
  source?: string | null;
};

export function addPurchaseRequestNote(
  request: PurchaseRequest,
  input: AddPurchaseRequestNoteInput,
): PurchaseRequestResult {
  const forbidden = rejectForbidden(input);
  if (forbidden) return fail(forbidden);
  const at = parseTime(input.at);
  if (!at) return fail('invalid_time');
  const actorLabel = requiredText(input.actorLabel);
  const noteId = requiredText(input.noteId);
  const body = requiredText(input.body);
  if (!actorLabel) return fail('actor_required');
  if (!noteId || !body) return fail('note_required');
  const actorMemberId = optionalId.safeParse(input.actorMemberId ?? null);
  if (!actorMemberId.success) return fail('invalid_status');

  const note: PurchaseRequestNote = {
    id: noteId,
    body,
    at,
    actorLabel,
    actorMemberId: actorMemberId.data,
    source: PURCHASE_REQUEST_SOURCE,
    evidenceReference: requiredText(input.evidenceReference),
  };

  return {
    ok: true,
    request: {
      ...request,
      notes: [...request.notes.map((item) => ({ ...item })), note],
      statusHistory: request.statusHistory.map((item) => ({ ...item })),
      claimsOfficialStock: false,
      triggersReorder: false,
      stockAuthority: PURCHASE_REQUEST_STOCK_AUTHORITY,
      reorderPolicy: PURCHASE_REQUEST_REORDER_POLICY,
      actorLabel,
      actorMemberId: actorMemberId.data,
      updatedAt: at,
    },
  };
}

export type AssignPurchaseRequestBuyerInput = {
  buyerLabel: string;
  buyerMemberId?: string | null;
  at: string;
  actorLabel: string;
  actorMemberId?: string | null;
  source?: string | null;
};

/** Names the person who buys. Does not create a supplier party or change status. */
export function assignPurchaseRequestBuyer(
  request: PurchaseRequest,
  input: AssignPurchaseRequestBuyerInput,
): PurchaseRequestResult {
  const forbidden = rejectForbidden(input);
  if (forbidden) return fail(forbidden);
  const current = mapLegacyPurchaseRequestStatus(request.status);
  if (!current || current === 'entregado' || current === 'cancelled') return fail('terminal');
  const at = parseTime(input.at);
  if (!at) return fail('invalid_time');
  const buyerLabel = requiredText(input.buyerLabel);
  const actorLabel = requiredText(input.actorLabel);
  if (!buyerLabel || !actorLabel) return fail('actor_required');
  const buyerMemberId = optionalId.safeParse(input.buyerMemberId ?? null);
  const actorMemberId = optionalId.safeParse(input.actorMemberId ?? null);
  if (!buyerMemberId.success || !actorMemberId.success) return fail('invalid_status');

  return {
    ok: true,
    request: {
      ...request,
      status: current,
      buyerLabel,
      buyerMemberId: buyerMemberId.data,
      actorLabel,
      actorMemberId: actorMemberId.data,
      statusHistory: request.statusHistory.map((item) => ({ ...item })),
      notes: request.notes.map((item) => ({ ...item })),
      claimsOfficialStock: false,
      triggersReorder: false,
      stockAuthority: PURCHASE_REQUEST_STOCK_AUTHORITY,
      reorderPolicy: PURCHASE_REQUEST_REORDER_POLICY,
      updatedAt: at,
    },
  };
}

function cloneRequest(request: PurchaseRequest): PurchaseRequest {
  return {
    ...request,
    status: mapLegacyPurchaseRequestStatus(request.status) ?? request.status,
    notes: request.notes.map((note) => ({ ...note })),
    statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
    claimsOfficialStock: false,
    triggersReorder: false,
  };
}
