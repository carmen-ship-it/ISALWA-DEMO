import type { DeliverySubjectType, DispatchLedgerRows } from '@isalwa/os-contracts';
import { DELIVERY_NOTES_LIST_LIMIT } from './list-limits';
import type {
  DeliveryDomainEventRecord,
  DeliveryIdempotencyRecord,
  DeliveryNoteRecord,
  DeliveryRecord,
  DeliveryStore,
  EvidenceRecord,
  MemberSnapshot,
  NoteLineRecord,
  OrderSnapshot,
  OutboundNoteRecord,
  WarehouseExitRecord,
} from './store-types';

function key(organizationId: string, id: string): string {
  return `${organizationId}:${id}`;
}

/**
 * Process-local rows. Inserting here does not prove the caller checked a trusted session.
 */
export const MEMORY_DELIVERY_STORE_IS_TENANT_PROOF = false;

export class MemoryDeliveryStore implements DeliveryStore {
  private readonly orders = new Map<string, OrderSnapshot>();
  private readonly members = new Map<string, MemberSnapshot>();
  private readonly exits: WarehouseExitRecord[] = [];
  private readonly outboundNotes: OutboundNoteRecord[] = [];
  private readonly outboundLines: NoteLineRecord[] = [];
  private readonly deliveries: DeliveryRecord[] = [];
  private readonly deliveryNotes: DeliveryNoteRecord[] = [];
  private readonly deliveryLines: NoteLineRecord[] = [];
  private readonly evidence: EvidenceRecord[] = [];
  private readonly events: DeliveryDomainEventRecord[] = [];
  private readonly idempotency = new Map<string, DeliveryIdempotencyRecord>();

  /** Serializes transactions. Coarser than Postgres' per-order lock, which is fine in memory. */
  private txTail: Promise<void> = Promise.resolve();

  /**
   * All-or-nothing in memory: transactions run one at a time and restore the row arrays on
   * throw. This proves service logic only; it is not a database transaction.
   * The `tx` view shares the same rows but joins (does not re-queue) a nested call.
   */
  async runInTransaction<T>(fn: (tx: DeliveryStore) => Promise<T>): Promise<T> {
    const previous = this.txTail;
    let release!: () => void;
    this.txTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const snapshot = this.snapshotRows();
    const view = Object.create(this) as MemoryDeliveryStore;
    view.runInTransaction = async (inner) => inner(view);
    try {
      return await fn(view);
    } catch (err) {
      this.restoreRows(snapshot);
      throw err;
    } finally {
      release();
    }
  }

  private snapshotRows() {
    return {
      exits: this.exits.slice(),
      outboundNotes: this.outboundNotes.slice(),
      outboundLines: this.outboundLines.slice(),
      deliveries: this.deliveries.slice(),
      deliveryNotes: this.deliveryNotes.slice(),
      deliveryLines: this.deliveryLines.slice(),
      evidence: this.evidence.slice(),
      events: this.events.slice(),
    };
  }

  private restoreRows(snapshot: ReturnType<MemoryDeliveryStore['snapshotRows']>): void {
    this.exits.splice(0, this.exits.length, ...snapshot.exits);
    this.outboundNotes.splice(0, this.outboundNotes.length, ...snapshot.outboundNotes);
    this.outboundLines.splice(0, this.outboundLines.length, ...snapshot.outboundLines);
    this.deliveries.splice(0, this.deliveries.length, ...snapshot.deliveries);
    this.deliveryNotes.splice(0, this.deliveryNotes.length, ...snapshot.deliveryNotes);
    this.deliveryLines.splice(0, this.deliveryLines.length, ...snapshot.deliveryLines);
    this.evidence.splice(0, this.evidence.length, ...snapshot.evidence);
    this.events.splice(0, this.events.length, ...snapshot.events);
  }

  /** No-op: runInTransaction already serializes every transaction. */
  async lockOrderForUpdate(_organizationId: string, _orderId: string): Promise<void> {}

  async listDispatchLedgerRows(organizationId: string, orderId: string): Promise<DispatchLedgerRows> {
    const notes = this.deliveryNotes.filter(
      (row) => row.organizationId === organizationId && row.orderId === orderId,
    );
    const noteIds = new Set(notes.map((row) => row.id));
    const exits = this.exits.filter((row) => row.organizationId === organizationId && row.orderId === orderId);
    const exitByOutboundNote = new Map(
      this.outboundNotes
        .filter((row) => row.organizationId === organizationId && row.orderId === orderId)
        .map((row) => [row.id, row.warehouseExitId] as const),
    );
    return {
      notes: notes.map((row) => ({ id: row.id, status: row.status })),
      noteLines: this.deliveryLines
        .filter((row) => row.organizationId === organizationId && noteIds.has(row.noteId))
        .map((row) => ({ noteId: row.noteId, orderLineId: row.orderLineId, quantity: row.quantity })),
      exits: exits.map((row) => ({ id: row.id, deliveryNoteId: row.deliveryNoteId })),
      outboundLines: this.outboundLines
        .filter((row) => row.organizationId === organizationId && exitByOutboundNote.has(row.noteId))
        .map((row) => ({
          warehouseExitId: exitByOutboundNote.get(row.noteId) as string,
          orderLineId: row.orderLineId,
          quantity: row.quantity,
        })),
    };
  }

  async reverseIssuedDeliveryNote(organizationId: string, noteId: string, reason: string): Promise<boolean> {
    const index = this.deliveryNotes.findIndex(
      (note) => note.organizationId === organizationId && note.id === noteId,
    );
    const current = this.deliveryNotes[index];
    if (!current || current.status !== 'issued') return false;
    this.deliveryNotes[index] = { ...current, status: 'reversed', correctionReason: reason };
    return true;
  }

  putOrder(order: OrderSnapshot): void {
    this.orders.set(key(order.organizationId, order.id), order);
  }

  putMember(member: MemberSnapshot): void {
    this.members.set(key(member.organizationId, member.id), member);
  }

  async getOrderInOrg(organizationId: string, orderId: string): Promise<OrderSnapshot | null> {
    return this.orders.get(key(organizationId, orderId)) ?? null;
  }

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberSnapshot | null> {
    return this.members.get(key(organizationId, memberId)) ?? null;
  }

  async insertWarehouseExit(row: WarehouseExitRecord): Promise<void> {
    this.exits.push(row);
  }

  async insertOutboundNote(row: OutboundNoteRecord): Promise<void> {
    this.outboundNotes.push(row);
  }

  async insertOutboundLines(rows: NoteLineRecord[]): Promise<void> {
    this.outboundLines.push(...rows);
  }

  async insertDelivery(row: DeliveryRecord): Promise<void> {
    this.deliveries.push(row);
  }

  async insertDeliveryNote(row: DeliveryNoteRecord): Promise<void> {
    this.deliveryNotes.push(row);
  }

  async insertDeliveryNoteLines(rows: NoteLineRecord[]): Promise<void> {
    this.deliveryLines.push(...rows);
  }

  async updateDeliveryNote(row: DeliveryNoteRecord): Promise<void> {
    const index = this.deliveryNotes.findIndex(
      (note) => note.organizationId === row.organizationId && note.id === row.id,
    );
    if (index < 0) throw new Error('NOT_FOUND');
    this.deliveryNotes[index] = row;
  }

  async insertEvidence(row: EvidenceRecord): Promise<void> {
    this.evidence.push(row);
  }

  async appendDomainEvent(row: DeliveryDomainEventRecord): Promise<void> {
    this.events.push(row);
  }

  async listWarehouseExits(
    organizationId: string,
    orderId: string,
  ): Promise<WarehouseExitRecord[]> {
    return this.exits.filter(
      (row) => row.organizationId === organizationId && row.orderId === orderId,
    );
  }

  async getWarehouseExit(
    organizationId: string,
    warehouseExitId: string,
  ): Promise<WarehouseExitRecord | null> {
    return (
      this.exits.find(
        (row) => row.organizationId === organizationId && row.id === warehouseExitId,
      ) ?? null
    );
  }

  async getOutboundNote(
    organizationId: string,
    warehouseExitId: string,
  ): Promise<OutboundNoteRecord | null> {
    return (
      this.outboundNotes.find(
        (row) => row.organizationId === organizationId && row.warehouseExitId === warehouseExitId,
      ) ?? null
    );
  }

  async listDeliveries(organizationId: string, orderId: string): Promise<DeliveryRecord[]> {
    return this.deliveries.filter(
      (row) => row.organizationId === organizationId && row.orderId === orderId,
    );
  }

  async getDelivery(organizationId: string, deliveryId: string): Promise<DeliveryRecord | null> {
    return (
      this.deliveries.find(
        (row) => row.organizationId === organizationId && row.id === deliveryId,
      ) ?? null
    );
  }

  async getDeliveryNote(
    organizationId: string,
    deliveryId: string,
  ): Promise<DeliveryNoteRecord | null> {
    return (
      this.deliveryNotes.find(
        (row) => row.organizationId === organizationId && row.deliveryId === deliveryId,
      ) ?? null
    );
  }

  async listDeliveryNotes(organizationId: string, orderId: string): Promise<DeliveryNoteRecord[]> {
    const matched = this.deliveryNotes.filter(
      (row) => row.organizationId === organizationId && row.orderId === orderId,
    );
    return matched
      .slice()
      .sort((a, b) => String(b.bornAt ?? '').localeCompare(String(a.bornAt ?? '')))
      .slice(0, DELIVERY_NOTES_LIST_LIMIT);
  }

  async listOutboundLines(organizationId: string, noteId: string): Promise<NoteLineRecord[]> {
    return this.outboundLines.filter(
      (row) => row.organizationId === organizationId && row.noteId === noteId,
    );
  }

  async listDeliveryNoteLines(organizationId: string, noteId: string): Promise<NoteLineRecord[]> {
    return this.deliveryLines.filter(
      (row) => row.organizationId === organizationId && row.noteId === noteId,
    );
  }

  async listEvidence(
    organizationId: string,
    subjectType: DeliverySubjectType,
    subjectId: string,
  ): Promise<EvidenceRecord[]> {
    return this.evidence.filter(
      (row) =>
        row.organizationId === organizationId &&
        row.subjectType === subjectType &&
        row.subjectId === subjectId,
    );
  }

  async listAllWarehouseExits(organizationId: string): Promise<WarehouseExitRecord[]> {
    return this.exits.filter((row) => row.organizationId === organizationId);
  }

  async listAllDeliveries(organizationId: string): Promise<DeliveryRecord[]> {
    return this.deliveries.filter((row) => row.organizationId === organizationId);
  }

  async listAllDeliveryNotes(organizationId: string): Promise<DeliveryNoteRecord[]> {
    return this.deliveryNotes.filter((row) => row.organizationId === organizationId);
  }

  async getDeliveryNoteById(
    organizationId: string,
    noteId: string,
  ): Promise<DeliveryNoteRecord | null> {
    return (
      this.deliveryNotes.find(
        (row) => row.organizationId === organizationId && row.id === noteId,
      ) ?? null
    );
  }

  async listRecipientCandidates(organizationId: string) {
    const fromNotes = this.deliveryNotes
      .filter((row) => row.organizationId === organizationId && row.recipient)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.recipient }));
    const fromDeliveries = this.deliveries
      .filter((row) => row.organizationId === organizationId && row.deliveredTo)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.deliveredTo as string }));
    const fromEvidence = this.evidence
      .filter((row) => row.organizationId === organizationId && row.recipient)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.recipient as string }));
    return [...fromNotes, ...fromDeliveries, ...fromEvidence];
  }

  async listDomainEvents(
    organizationId: string,
    orderId?: string,
  ): Promise<DeliveryDomainEventRecord[]> {
    return this.events.filter(
      (row) => row.organizationId === organizationId && (!orderId || row.orderId === orderId),
    );
  }

  async findIdempotency(
    organizationId: string,
    key: string,
  ): Promise<DeliveryIdempotencyRecord | null> {
    const row = this.idempotency.get(`${organizationId}:${key}`) ?? null;
    if (!row || row.expiresAt.getTime() <= Date.now()) return null;
    return row;
  }

  async saveIdempotency(record: DeliveryIdempotencyRecord): Promise<void> {
    const id = `${record.organizationId}:${record.key}`;
    if (this.idempotency.has(id)) {
      throw Object.assign(new Error('IDEMPOTENCY_CONFLICT'), { code: 'P2002' });
    }
    this.idempotency.set(id, record);
  }

  async completeIdempotency(
    organizationId: string,
    key: string,
    resultJson: Record<string, unknown>,
  ): Promise<void> {
    const row = this.idempotency.get(`${organizationId}:${key}`);
    if (!row) return;
    row.resultJson = resultJson;
  }

  async deleteIdempotency(organizationId: string, key: string): Promise<void> {
    this.idempotency.delete(`${organizationId}:${key}`);
  }

  /** Unscoped snapshots. The command service must not call these. */
  protected warehouseExitRows(): WarehouseExitRecord[] {
    return this.exits;
  }

  protected deliveryRows(): DeliveryRecord[] {
    return this.deliveries;
  }

  protected deliveryNoteRows(): DeliveryNoteRecord[] {
    return this.deliveryNotes;
  }

  protected recipientRows(): Array<{ organizationId: string; recipient: string }> {
    const fromNotes = this.deliveryNotes
      .filter((row) => row.recipient)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.recipient }));
    const fromDeliveries = this.deliveries
      .filter((row) => row.deliveredTo)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.deliveredTo as string }));
    const fromEvidence = this.evidence
      .filter((row) => row.recipient)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.recipient as string }));
    return [...fromNotes, ...fromDeliveries, ...fromEvidence];
  }
}
