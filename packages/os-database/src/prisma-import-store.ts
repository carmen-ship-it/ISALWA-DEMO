import type { OsImportStore } from '@isalwa/os-import';
import type {
  ImportBatchRecord,
  ImportEntityRefs,
  ImportReceipt,
  ImportRowRecord,
  MatchCatalog,
  MatchCatalogParty,
} from '@isalwa/os-import';
import { normalizeNitKey } from '@isalwa/os-import';
import type { OsPrismaClient } from './client';
import { Prisma } from './generated/client';

function mapBatch(row: {
  id: string;
  organizationId: string;
  sourceKind: string;
  sourceFingerprint: string;
  status: string;
  createdByMemberId: string;
  createdAt: Date;
  completedAt: Date | null;
  receiptJson: Prisma.JsonValue;
  idempotencyKey: string;
  reversedAt: Date | null;
  reversedEntityRefs: Prisma.JsonValue | null;
}): ImportBatchRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    sourceKind: row.sourceKind as ImportBatchRecord['sourceKind'],
    sourceFingerprint: row.sourceFingerprint,
    status: row.status as ImportBatchRecord['status'],
    createdByMemberId: row.createdByMemberId,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    receiptJson: row.receiptJson as unknown as ImportReceipt,
    idempotencyKey: row.idempotencyKey,
    reversedAt: row.reversedAt,
    reversedEntityRefs: (row.reversedEntityRefs as Record<string, unknown> | null) ?? null,
  };
}

function mapRow(row: {
  id: string;
  importBatchId: string;
  organizationId: string;
  section: string;
  rowIndex: number;
  outcome: string;
  entityRefsJson: Prisma.JsonValue;
  errorCode: string | null;
  normalizedSnapshotJson: Prisma.JsonValue;
}): ImportRowRecord {
  return {
    id: row.id,
    importBatchId: row.importBatchId,
    organizationId: row.organizationId,
    section: row.section as ImportRowRecord['section'],
    rowIndex: row.rowIndex,
    outcome: row.outcome as ImportRowRecord['outcome'],
    entityRefsJson: row.entityRefsJson as ImportEntityRefs,
    errorCode: row.errorCode,
    normalizedSnapshotJson: row.normalizedSnapshotJson as Record<string, unknown>,
  };
}

export class PrismaOsImportStore implements OsImportStore {
  private tx?: Prisma.TransactionClient;

  constructor(private readonly prisma: OsPrismaClient) {}

  private db(): OsPrismaClient | Prisma.TransactionClient {
    return this.tx ?? this.prisma;
  }

  async runInTransaction<T>(fn: (store: OsImportStore) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const scoped = new PrismaOsImportStore(this.prisma);
      scoped.tx = tx;
      return fn(scoped);
    });
  }

  async loadMatchCatalog(organizationId: string): Promise<MatchCatalog> {
    const parties = await this.db().osParty.findMany({
      where: { organizationId, status: 'active' },
    });
    const contacts = await this.db().osContact.findMany({
      where: { organizationId },
    });
    const fiscals = await this.db().osFiscalIdentity.findMany({
      where: { organizationId, endedAt: null },
    });

    const byParty = new Map<string, MatchCatalogParty>();
    for (const p of parties) {
      byParty.set(p.id, {
        partyId: p.id,
        partyKind: p.partyKind as 'organization' | 'person',
        displayName: p.displayName,
        status: p.status,
        nitKeys: [],
        contacts: [],
      });
    }
    for (const f of fiscals) {
      const party = byParty.get(f.partyId);
      if (!party) continue;
      const key = normalizeNitKey(f.nit);
      if (key) party.nitKeys.push(key);
    }
    for (const c of contacts) {
      const party = byParty.get(c.organizationPartyId);
      if (!party) continue;
      party.contacts.push({
        contactId: c.id,
        givenName: c.givenName,
        familyName: c.familyName,
        email: c.email,
        phone: c.phone,
        whatsapp: c.whatsapp,
      });
    }

    return { parties: [...byParty.values()] };
  }

  async insertBatch(batch: ImportBatchRecord): Promise<void> {
    await this.db().osImportBatch.create({
      data: {
        id: batch.id,
        organizationId: batch.organizationId,
        sourceKind: batch.sourceKind,
        sourceFingerprint: batch.sourceFingerprint,
        status: batch.status,
        createdByMemberId: batch.createdByMemberId,
        createdAt: batch.createdAt,
        completedAt: batch.completedAt,
        receiptJson: batch.receiptJson as unknown as Prisma.InputJsonValue,
        idempotencyKey: batch.idempotencyKey,
        reversedAt: batch.reversedAt,
        reversedEntityRefs: batch.reversedEntityRefs as unknown as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async insertRows(rows: ImportRowRecord[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db().osImportRow.createMany({
      data: rows.map((row) => ({
        id: row.id,
        importBatchId: row.importBatchId,
        organizationId: row.organizationId,
        section: row.section,
        rowIndex: row.rowIndex,
        outcome: row.outcome,
        entityRefsJson: row.entityRefsJson as unknown as Prisma.InputJsonValue,
        errorCode: row.errorCode,
        normalizedSnapshotJson: row.normalizedSnapshotJson as unknown as Prisma.InputJsonValue,
      })),
    });
  }

  async getBatchInOrg(organizationId: string, importBatchId: string): Promise<ImportBatchRecord | null> {
    const row = await this.db().osImportBatch.findFirst({
      where: { id: importBatchId, organizationId },
    });
    return row ? mapBatch(row) : null;
  }

  async listRowsForBatch(organizationId: string, importBatchId: string): Promise<ImportRowRecord[]> {
    const rows = await this.db().osImportRow.findMany({
      where: { organizationId, importBatchId },
      orderBy: [{ section: 'asc' }, { rowIndex: 'asc' }],
    });
    return rows.map(mapRow);
  }

  async updateBatch(
    organizationId: string,
    importBatchId: string,
    patch: Partial<
      Pick<
        ImportBatchRecord,
        'status' | 'completedAt' | 'receiptJson' | 'reversedAt' | 'reversedEntityRefs'
      >
    >,
  ): Promise<void> {
    await this.db().osImportBatch.updateMany({
      where: { id: importBatchId, organizationId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
        ...(patch.receiptJson !== undefined
          ? { receiptJson: patch.receiptJson as unknown as Prisma.InputJsonValue }
          : {}),
        ...(patch.reversedAt !== undefined ? { reversedAt: patch.reversedAt } : {}),
        ...(patch.reversedEntityRefs !== undefined
          ? {
              reversedEntityRefs: patch.reversedEntityRefs as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  }

  async updateRowEntityRefs(
    organizationId: string,
    rowId: string,
    entityRefs: ImportEntityRefs,
    outcome?: ImportRowRecord['outcome'],
  ): Promise<void> {
    await this.db().osImportRow.updateMany({
      where: { id: rowId, organizationId },
      data: {
        entityRefsJson: entityRefs as unknown as Prisma.InputJsonValue,
        ...(outcome !== undefined ? { outcome } : {}),
      },
    });
  }

  async deactivateContactInOrg(organizationId: string, contactId: string): Promise<void> {
    await this.db().osContact.updateMany({
      where: { id: contactId, organizationId },
      data: { status: 'inactive' },
    });
  }
}
