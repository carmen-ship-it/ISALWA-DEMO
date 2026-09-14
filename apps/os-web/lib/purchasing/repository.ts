import type {
  PurchaseBuyerCandidate,
  PurchaseRequest,
  PurchaseRequestSession,
} from '@isalwa/os-contracts';

/**
 * Process-local queue for the mounted Compras page.
 * Rows are organization-scoped. There is no sample data and no other tenant.
 * CROSS_LANE: a hosted persistence adapter is not owned here. Do not invent rows.
 */
class ComprasRepository {
  private readonly rows: PurchaseRequest[] = [];
  private readonly people: PurchaseBuyerCandidate[] = [];
  private readonly roles = new Map<string, PurchaseRequestSession['role']>();

  sessionFor(organizationId: string): PurchaseRequestSession {
    return {
      organizationId,
      role: this.roles.get(organizationId) ?? null,
      grantedScopes: [],
    };
  }

  rememberRole(organizationId: string, role: 'buyer' | 'requester') {
    this.roles.set(organizationId, role);
  }

  requests(): readonly PurchaseRequest[] {
    return this.rows.map((request) => ({
      ...request,
      notes: request.notes.map((note) => ({ ...note })),
      statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
    }));
  }

  candidates(): readonly PurchaseBuyerCandidate[] {
    return this.people.map((person) => ({ ...person }));
  }

  save(request: PurchaseRequest) {
    const index = this.rows.findIndex(
      (row) => row.organizationId === request.organizationId && row.id === request.id,
    );
    const copy = {
      ...request,
      notes: request.notes.map((note) => ({ ...note })),
      statusHistory: request.statusHistory.map((entry) => ({ ...entry })),
    };
    if (index >= 0) this.rows[index] = copy;
    else this.rows.push(copy);
  }

  rememberPerson(organizationId: string, label: string, role: 'buyer' | 'requester') {
    const trimmed = label.trim();
    if (!trimmed) return;
    const exists = this.people.some(
      (person) =>
        person.organizationId === organizationId &&
        person.role === role &&
        person.label.toLocaleLowerCase('es') === trimmed.toLocaleLowerCase('es'),
    );
    if (!exists) this.people.push({ organizationId, label: trimmed, role });
  }
}

export const comprasRepository = new ComprasRepository();
