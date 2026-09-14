import {
  addPurchaseRequestNote,
  assignPurchaseRequestBuyer,
  changePurchaseRequestStatus,
  createPurchaseRequest,
  type AddPurchaseRequestNoteInput,
  type AssignPurchaseRequestBuyerInput,
  type ChangePurchaseRequestStatusInput,
  type CreatePurchaseRequestInput,
  type PurchaseRequest,
  type PurchaseRequestResult,
} from '../../os-contracts/src/purchase-request';

export type PurchaseRequestStoreFailure = 'not_found' | 'already_exists';

export type PurchaseRequestStoreResult =
  | PurchaseRequestResult
  | { ok: false; reason: PurchaseRequestStoreFailure };

/**
 * In-memory purchase requests. Not an inventory ledger and not an ERP.
 * Every read and write is scoped to one organization. Cross-tenant ids look missing.
 * Status history is appended. Nothing here reorders or posts stock.
 */
export class InMemoryPurchaseRequestStore {
  private readonly records = new Map<string, PurchaseRequest>();

  create(input: CreatePurchaseRequestInput): PurchaseRequestStoreResult {
    const idempotencyKey = input.idempotencyKey?.trim();
    const organizationId = input.organizationId?.trim();
    if (idempotencyKey && organizationId) {
      const existing = this.findByIdempotency(organizationId, idempotencyKey);
      if (existing) return { ok: true, request: cloneRequest(existing) };
    }

    const created = createPurchaseRequest(input);
    if (!created.ok) return created;
    const key = recordKey(created.request.organizationId, created.request.id);
    if (this.records.has(key)) return { ok: false, reason: 'already_exists' };
    this.records.set(key, created.request);
    return { ok: true, request: cloneRequest(created.request) };
  }

  get(organizationId: string, id: string): PurchaseRequest | null {
    const found = this.records.get(recordKey(organizationId, id));
    return found ? cloneRequest(found) : null;
  }

  list(organizationId: string): PurchaseRequest[] {
    return [...this.records.values()]
      .filter((request) => request.organizationId === organizationId)
      .map(cloneRequest);
  }

  changeStatus(
    organizationId: string,
    id: string,
    input: ChangePurchaseRequestStatusInput,
  ): PurchaseRequestStoreResult {
    const current = this.records.get(recordKey(organizationId, id));
    if (!current) return { ok: false, reason: 'not_found' };
    const changed = changePurchaseRequestStatus(current, input);
    if (!changed.ok) return changed;
    this.records.set(recordKey(organizationId, id), changed.request);
    return { ok: true, request: cloneRequest(changed.request) };
  }

  addNote(
    organizationId: string,
    id: string,
    input: AddPurchaseRequestNoteInput,
  ): PurchaseRequestStoreResult {
    const current = this.records.get(recordKey(organizationId, id));
    if (!current) return { ok: false, reason: 'not_found' };
    const noted = addPurchaseRequestNote(current, input);
    if (!noted.ok) return noted;
    this.records.set(recordKey(organizationId, id), noted.request);
    return { ok: true, request: cloneRequest(noted.request) };
  }

  assignBuyer(
    organizationId: string,
    id: string,
    input: AssignPurchaseRequestBuyerInput,
  ): PurchaseRequestStoreResult {
    const current = this.records.get(recordKey(organizationId, id));
    if (!current) return { ok: false, reason: 'not_found' };
    const assigned = assignPurchaseRequestBuyer(current, input);
    if (!assigned.ok) return assigned;
    this.records.set(recordKey(organizationId, id), assigned.request);
    return { ok: true, request: cloneRequest(assigned.request) };
  }

  private findByIdempotency(organizationId: string, idempotencyKey: string): PurchaseRequest | null {
    for (const request of this.records.values()) {
      if (request.organizationId === organizationId && request.idempotencyKey === idempotencyKey) {
        return request;
      }
    }
    return null;
  }
}

function recordKey(organizationId: string, id: string): string {
  return `${organizationId}\0${id}`;
}

function cloneRequest(request: PurchaseRequest): PurchaseRequest {
  return {
    ...request,
    notes: request.notes.map((note) => ({ ...note })),
    statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
    claimsOfficialStock: false,
    triggersReorder: false,
  };
}
