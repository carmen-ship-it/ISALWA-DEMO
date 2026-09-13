import type {
  ImportBatchRecord,
  ImportRowRecord,
  MatchCatalog,
} from './types';

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

  /** Soft-deactivate a contact created by this batch (no DeactivateContact command). */
  deactivateContactInOrg(organizationId: string, contactId: string): Promise<void>;
}
