import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  ImportBatchRecord,
  ImportReceipt,
  ImportRowRecord,
  MatchCatalog,
} from './types';

export type ImportPhoneDecisionWrite = {
  organizationId: string;
  importBatchId: string;
  rowId: string;
  /** Row phone review version the decision was made against; a different stored version is CONFLICT. */
  expectedVersion: number;
  row: Pick<ImportRowRecord, 'outcome' | 'errorCode' | 'entityRefsJson' | 'normalizedSnapshotJson'>;
  receipt: ImportReceipt;
  event: StoredBusinessEvent;
  outbox: StoredOutboxMessage;
  audit: StoredAuditLog;
};

export interface OsImportStore {
  runInTransaction<T>(fn: (store: OsImportStore) => Promise<T>): Promise<T>;

  loadMatchCatalog(organizationId: string): Promise<MatchCatalog>;

  insertBatch(batch: ImportBatchRecord): Promise<void>;
  insertRows(rows: ImportRowRecord[]): Promise<void>;
  getBatchInOrg(organizationId: string, importBatchId: string): Promise<ImportBatchRecord | null>;
  listRowsForBatch(organizationId: string, importBatchId: string): Promise<ImportRowRecord[]>;
  updateBatch(
    organizationId: string,
    importBatchId: string,
    patch: Partial<
      Pick<
        ImportBatchRecord,
        'status' | 'completedAt' | 'receiptJson' | 'reversedAt' | 'reversedEntityRefs'
      >
    >,
  ): Promise<void>;
  updateRowEntityRefs(
    organizationId: string,
    rowId: string,
    entityRefs: ImportRowRecord['entityRefsJson'],
    outcome?: ImportRowRecord['outcome'],
  ): Promise<void>;

  /** Row decision, batch receipt, event, outbox and audit in one transaction. */
  recordPhoneDecision(write: ImportPhoneDecisionWrite): Promise<void>;

  /** Soft-deactivate a contact created by this batch (no DeactivateContact command). */
  deactivateContactInOrg(organizationId: string, contactId: string): Promise<void>;
}
