import type { DeliverySubjectType } from '../../os-contracts/src/delivery';
import type {
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

  async insertEvidence(row: EvidenceRecord): Promise<void> {
    this.evidence.push(row);
  }

  async listWarehouseExits(organizationId: string, orderId: string): Promise<WarehouseExitRecord[]> {
    return this.exits.filter((row) => row.organizationId === organizationId && row.orderId === orderId);
  }

  async getWarehouseExit(organizationId: string, warehouseExitId: string): Promise<WarehouseExitRecord | null> {
    return this.exits.find((row) => row.organizationId === organizationId && row.id === warehouseExitId) ?? null;
  }

  async getOutboundNote(organizationId: string, warehouseExitId: string): Promise<OutboundNoteRecord | null> {
    return (
      this.outboundNotes.find(
        (row) => row.organizationId === organizationId && row.warehouseExitId === warehouseExitId,
      ) ?? null
    );
  }

  async listDeliveries(organizationId: string, orderId: string): Promise<DeliveryRecord[]> {
    return this.deliveries.filter((row) => row.organizationId === organizationId && row.orderId === orderId);
  }

  async getDelivery(organizationId: string, deliveryId: string): Promise<DeliveryRecord | null> {
    return this.deliveries.find((row) => row.organizationId === organizationId && row.id === deliveryId) ?? null;
  }

  async getDeliveryNote(organizationId: string, deliveryId: string): Promise<DeliveryNoteRecord | null> {
    return (
      this.deliveryNotes.find((row) => row.organizationId === organizationId && row.deliveryId === deliveryId) ?? null
    );
  }

  async listDeliveryNotes(organizationId: string, orderId: string): Promise<DeliveryNoteRecord[]> {
    return this.deliveryNotes.filter((row) => row.organizationId === organizationId && row.orderId === orderId);
  }

  async listOutboundLines(organizationId: string, noteId: string): Promise<NoteLineRecord[]> {
    return this.outboundLines.filter((row) => row.organizationId === organizationId && row.noteId === noteId);
  }

  async listDeliveryNoteLines(organizationId: string, noteId: string): Promise<NoteLineRecord[]> {
    return this.deliveryLines.filter((row) => row.organizationId === organizationId && row.noteId === noteId);
  }

  async listEvidence(
    organizationId: string,
    subjectType: DeliverySubjectType,
    subjectId: string,
  ): Promise<EvidenceRecord[]> {
    return this.evidence.filter(
      (row) => row.organizationId === organizationId && row.subjectType === subjectType && row.subjectId === subjectId,
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

  async getDeliveryNoteById(organizationId: string, noteId: string): Promise<DeliveryNoteRecord | null> {
    return this.deliveryNotes.find((row) => row.organizationId === organizationId && row.id === noteId) ?? null;
  }

  async listRecipientCandidates(organizationId: string) {
    const fromDeliveries = this.deliveries
      .filter((row) => row.organizationId === organizationId && row.deliveredTo)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.deliveredTo as string }));
    const fromEvidence = this.evidence
      .filter((row) => row.organizationId === organizationId && row.recipient)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.recipient as string }));
    return [...fromDeliveries, ...fromEvidence];
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
    const fromDeliveries = this.deliveries
      .filter((row) => row.deliveredTo)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.deliveredTo as string }));
    const fromEvidence = this.evidence
      .filter((row) => row.recipient)
      .map((row) => ({ organizationId: row.organizationId, recipient: row.recipient as string }));
    return [...fromDeliveries, ...fromEvidence];
  }
}
