import {
  addPurchaseRequestNote,
  assignPurchaseRequestBuyer,
  changePurchaseRequestStatus,
  countPurchaseRequests,
  createPurchaseRequest,
  readPurchaseRequestQueue,
  searchPurchaseRequests,
  suggestPurchaseBuyers,
  type AddPurchaseRequestNoteInput,
  type AssignPurchaseRequestBuyerInput,
  type ChangePurchaseRequestStatusInput,
  type CreatePurchaseRequestInput,
  type PurchaseBuyerCandidate,
  type PurchaseBuyerSuggestionResult,
  type PurchaseRequest,
  type PurchaseRequestCountResult,
  type PurchaseRequestQueueResult,
  type PurchaseRequestResult,
  type PurchaseRequestSearchResult,
  type PurchaseRequestSession,
} from '../../os-contracts/src/purchase-request';
import {
  authorizePurchaseRequestTransition,
  transitionPurchaseRequest,
  type PurchaseRequestTransitionResult,
} from './transition';

export type PurchaseRequestStoreFailure = 'not_found' | 'already_exists';

export type PurchaseRequestStoreResult =
  | PurchaseRequestResult
  | { ok: false; reason: PurchaseRequestStoreFailure };

/**
 * In-memory purchase requests. Not an inventory ledger and not an ERP.
 * Every read and write is scoped to one organization. Cross-tenant ids look missing.
 * Status history is appended. Nothing here reorders or posts stock.
 * changeStatus is an org-keyed fixture helper. Trusted mutation is transition().
 * Live persistence is UNPROVEN. This class is not a Prisma writer.
 */
export class InMemoryPurchaseRequestStore {
  private readonly records = new Map<string, PurchaseRequest>();
  private readonly people: PurchaseBuyerCandidate[] = [];

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
    this.rememberPerson(created.request.organizationId, created.request.requestedByLabel, 'requester');
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

  /**
   * Org-keyed fixture helper. It does not prove a trusted session.
   * Live writes stay UNPROVEN. Use transition() before a mutation.
   */
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
    if (changed.request.buyerLabel) {
      this.rememberPerson(organizationId, changed.request.buyerLabel, 'buyer');
    }
    return { ok: true, request: cloneRequest(changed.request) };
  }

  /**
   * Proves the target organization equals the trusted session organization
   * before mutation. A foreign id is the same as missing.
   */
  transition(
    session: PurchaseRequestSession | null | undefined,
    id: string,
    input: ChangePurchaseRequestStatusInput,
    targetOrganizationId?: string | null,
  ): PurchaseRequestTransitionResult {
    const gate = authorizePurchaseRequestTransition(session, targetOrganizationId);
    if (!gate.ok) {
      return { ok: false, reason: gate.reason, event: null, liveWrite: 'UNPROVEN' };
    }
    const current = this.records.get(recordKey(gate.organizationId, id));
    const changed = transitionPurchaseRequest({
      session,
      request: current && current.organizationId === gate.organizationId ? current : null,
      targetOrganizationId: gate.organizationId,
      change: input,
    });
    if (!changed.ok) return changed;
    this.records.set(recordKey(gate.organizationId, id), changed.request);
    if (changed.request.buyerLabel) {
      this.rememberPerson(gate.organizationId, changed.request.buyerLabel, 'buyer');
    }
    return { ...changed, request: cloneRequest(changed.request) };
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
    this.rememberPerson(organizationId, assigned.request.buyerLabel ?? '', 'buyer');
    return { ok: true, request: cloneRequest(assigned.request) };
  }

  /**
   * Queue read for one session organization. A missing org, a wrong role, or
   * another tenant returns no rows and no count.
   */
  readQueue(
    session: PurchaseRequestSession | null | undefined,
    targetOrganizationId?: string | null,
  ): PurchaseRequestQueueResult {
    return readPurchaseRequestQueue(session, this.snapshot(), targetOrganizationId);
  }

  searchQueue(
    session: PurchaseRequestSession | null | undefined,
    query: string,
    targetOrganizationId?: string | null,
  ): PurchaseRequestSearchResult {
    return searchPurchaseRequests(session, this.snapshot(), query, targetOrganizationId);
  }

  /** Compras queue count. Never includes another tenant. Denial has no number. */
  countQueue(
    session: PurchaseRequestSession | null | undefined,
    targetOrganizationId?: string | null,
  ): PurchaseRequestCountResult {
    return countPurchaseRequests(session, this.snapshot(), targetOrganizationId);
  }

  /** Suggests buyers in the session tenant. Never names another tenant's requester. */
  suggestBuyers(
    session: PurchaseRequestSession | null | undefined,
    query: string,
    targetOrganizationId?: string | null,
  ): PurchaseBuyerSuggestionResult {
    return suggestPurchaseBuyers(session, this.people, query, targetOrganizationId);
  }

  private snapshot(): PurchaseRequest[] {
    return [...this.records.values()];
  }

  private rememberPerson(organizationId: string, label: string, role: 'buyer' | 'requester') {
    const trimmed = label.trim();
    if (!organizationId || !trimmed) return;
    const exists = this.people.some(
      (person) =>
        person.organizationId === organizationId &&
        person.role === role &&
        person.label.toLocaleLowerCase('es') === trimmed.toLocaleLowerCase('es'),
    );
    if (!exists) this.people.push({ organizationId, label: trimmed, role });
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
