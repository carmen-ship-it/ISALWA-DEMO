import type { CopiedDeliveryLine, DeliveryEvidenceRole, DeliverySubjectType } from '../../os-contracts/src/delivery';

export type OrderSnapshot = {
  id: string;
  organizationId: string;
  status: string;
  lines: readonly unknown[] | null;
};

export type MemberSnapshot = {
  id: string;
  organizationId: string;
  accessStatus: string;
  /** Explicit scopes only. Missing means none. Cargo never fills this. */
  grantedScopes?: readonly string[];
};

export type RecipientCandidate = {
  organizationId: string;
  recipient: string;
};

export type WarehouseExitRecord = {
  id: string;
  organizationId: string;
  orderId: string;
  exitedAt: string;
  recordedByMemberId: string;
  source: 'employee_recorded';
  notes: string | null;
  createdAt: string;
};

export type OutboundNoteRecord = {
  id: string;
  organizationId: string;
  warehouseExitId: string;
  orderId: string;
  documentKind: 'nota_de_salida';
  numberingPolicy: 'unknown';
  noteNumber: null;
  exitedAt: string;
  bornAt: string;
  createdAt: string;
};

export type DeliveryRecord = {
  id: string;
  organizationId: string;
  orderId: string;
  deliveredAt: string;
  deliveredTo: string | null;
  recordedByMemberId: string;
  source: 'employee_recorded';
  notes: string | null;
  createdAt: string;
};

export type DeliveryNoteRecord = {
  id: string;
  organizationId: string;
  deliveryId: string;
  orderId: string;
  documentKind: 'nota_de_entrega';
  numberingPolicy: 'unknown';
  noteNumber: null;
  deliveredAt: string;
  bornAt: string;
  claimsInvoice: false;
  claimsTax: false;
  createdAt: string;
};

export type NoteLineRecord = CopiedDeliveryLine & {
  id: string;
  organizationId: string;
  noteId: string;
};

export type EvidenceRecord = {
  id: string;
  organizationId: string;
  subjectType: DeliverySubjectType;
  subjectId: string;
  role: DeliveryEvidenceRole;
  recordedByMemberId: string;
  reference: string | null;
  note: string | null;
  paymentState: 'reference' | 'authorized_exception' | null;
  exceptionReason: string | null;
  authorizedByMemberId: string | null;
  recipient: string | null;
  signatureReference: string | null;
  confirmedLedgerPayment: false;
  ledgerPosting: 'none';
  signatureMethod: null;
  createdAt: string;
};

export interface DeliveryStore {
  getOrderInOrg(organizationId: string, orderId: string): Promise<OrderSnapshot | null>;
  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberSnapshot | null>;
  insertWarehouseExit(row: WarehouseExitRecord): Promise<void>;
  insertOutboundNote(row: OutboundNoteRecord): Promise<void>;
  insertOutboundLines(rows: NoteLineRecord[]): Promise<void>;
  insertDelivery(row: DeliveryRecord): Promise<void>;
  insertDeliveryNote(row: DeliveryNoteRecord): Promise<void>;
  insertDeliveryNoteLines(rows: NoteLineRecord[]): Promise<void>;
  insertEvidence(row: EvidenceRecord): Promise<void>;
  listWarehouseExits(organizationId: string, orderId: string): Promise<WarehouseExitRecord[]>;
  getOutboundNote(organizationId: string, warehouseExitId: string): Promise<OutboundNoteRecord | null>;
  getWarehouseExit(organizationId: string, warehouseExitId: string): Promise<WarehouseExitRecord | null>;
  listDeliveries(organizationId: string, orderId: string): Promise<DeliveryRecord[]>;
  getDelivery(organizationId: string, deliveryId: string): Promise<DeliveryRecord | null>;
  getDeliveryNote(organizationId: string, deliveryId: string): Promise<DeliveryNoteRecord | null>;
  listDeliveryNotes(organizationId: string, orderId: string): Promise<DeliveryNoteRecord[]>;
  listOutboundLines(organizationId: string, noteId: string): Promise<NoteLineRecord[]>;
  listDeliveryNoteLines(organizationId: string, noteId: string): Promise<NoteLineRecord[]>;
  listEvidence(organizationId: string, subjectType: DeliverySubjectType, subjectId: string): Promise<EvidenceRecord[]>;
  listAllWarehouseExits(organizationId: string): Promise<WarehouseExitRecord[]>;
  listAllDeliveries(organizationId: string): Promise<DeliveryRecord[]>;
  listAllDeliveryNotes(organizationId: string): Promise<DeliveryNoteRecord[]>;
  getDeliveryNoteById(organizationId: string, noteId: string): Promise<DeliveryNoteRecord | null>;
  listRecipientCandidates(organizationId: string): Promise<RecipientCandidate[]>;
}
