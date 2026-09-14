/**
 * Prisma DeliveryStore. Customer delivery (delivery.record) and warehouse exit
 * (warehouse.outbound.record) are prisma_port against existing tables.
 * Migration apply remains separate (DELIVERY_MIGRATION_APPLIED = false).
 */

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
  RecipientCandidate,
  WarehouseExitRecord,
} from './store-types';

/** Memory path default. Customer delivery via this Prisma port is prisma_port. */
export const CUSTOMER_DELIVERY_PRISMA_LIVE_WRITE = 'prisma_port' as const;

/**
 * warehouse.outbound.record is registered on OPERATIONS_ACCESS_SCOPE_KEYS.
 * Prisma exit inserts are prisma_port; migration apply is still unapplied.
 */
export const WAREHOUSE_EXIT_WRITE_AUTHORITY = 'REGISTERED' as const;
export const WAREHOUSE_EXIT_LIVE_WRITE = 'prisma_port' as const;

export const DELIVERY_MIGRATION_APPLIED = false as const;

type FindFirst<T> = (args: { where: Record<string, unknown> }) => Promise<T | null>;
type FindMany<T> = (args: {
  where: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}) => Promise<T[]>;
type Create<T> = (args: { data: Record<string, unknown> }) => Promise<T>;
type CreateMany = (args: { data: Record<string, unknown>[] }) => Promise<unknown>;

type OrderRow = {
  id: string;
  organizationId: string;
  status: string;
  lines?: Array<{
    id: string;
    descriptionSnapshot: string;
    quantity: number;
    unitLabel: string | null;
    productRefSnapshot: string | null;
  }>;
};

type MemberRow = {
  id: string;
  organizationId: string;
  accessStatus: string;
};

type RoleRow = {
  roleKey: string;
  effectiveAt: Date | string;
  endedAt: Date | string | null;
};

type DelegationRow = {
  scopesJson: unknown;
  startsAt: Date | string;
  expiresAt: Date | string;
  revokedAt: Date | string | null;
};

type ExitRow = {
  id: string;
  organizationId: string;
  orderId: string;
  exitedAt: Date | string;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  createdAt: Date | string;
};

type OutboundNoteRow = {
  id: string;
  organizationId: string;
  warehouseExitId: string;
  orderId: string;
  documentKind: string;
  numberingPolicy: string;
  externalDocumentNumber: string | null;
  exitedAt: Date | string;
  bornAt: Date | string;
  createdAt: Date | string;
};

type DeliveryRow = {
  id: string;
  organizationId: string;
  orderId: string;
  deliveredAt: Date | string;
  deliveredTo: string | null;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  createdAt: Date | string;
};

type DeliveryNoteRow = {
  id: string;
  organizationId: string;
  deliveryId: string;
  orderId: string;
  documentKind: string;
  numberingPolicy: string;
  externalDocumentNumber: string | null;
  deliveredAt: Date | string;
  bornAt: Date | string;
  createdAt: Date | string;
};

type LineRow = {
  id: string;
  organizationId: string;
  outboundNoteId?: string;
  deliveryNoteId?: string;
  orderLineId: string;
  productRef: string | null;
  description: string;
  quantity: number;
  unitLabel: string | null;
};

type EvidenceRow = {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  role: string;
  recordedByMemberId: string;
  reference: string | null;
  note: string | null;
  paymentState: string | null;
  exceptionReason: string | null;
  authorizedByMemberId: string | null;
  recipient: string | null;
  signatureReference: string | null;
  confirmedLedgerPayment: boolean;
  ledgerPosting: string;
  createdAt: Date | string;
};

/**
 * Structural Prisma delegates. Does not import the generated client.
 * Warehouse exit and customer delivery delegates support prisma_port writers.
 */
export type DeliveryPrismaPort = {
  osOrder: {
    findFirst(args: {
      where: Record<string, unknown>;
      include?: { lines: boolean };
    }): Promise<OrderRow | null>;
  };
  osOrganizationMember: {
    findFirst: FindFirst<MemberRow>;
  };
  osRoleAssignment: {
    findMany: FindMany<RoleRow>;
  };
  osDelegation?: {
    findMany: FindMany<DelegationRow>;
  };
  osDelivery: {
    findFirst: FindFirst<DeliveryRow>;
    findMany: FindMany<DeliveryRow>;
    create: Create<DeliveryRow>;
  };
  osDeliveryNote: {
    findFirst: FindFirst<DeliveryNoteRow>;
    findMany: FindMany<DeliveryNoteRow>;
    create: Create<DeliveryNoteRow>;
  };
  osDeliveryNoteLine: {
    findMany: FindMany<LineRow>;
    createMany?: CreateMany;
    create?: Create<LineRow>;
  };
  osDeliveryEvidence: {
    findMany: FindMany<EvidenceRow>;
    create: Create<EvidenceRow>;
  };
  osWarehouseExit?: {
    findFirst: FindFirst<ExitRow>;
    findMany: FindMany<ExitRow>;
    create: Create<ExitRow>;
  };
  osWarehouseOutboundNote?: {
    findFirst: FindFirst<OutboundNoteRow>;
    findMany: FindMany<OutboundNoteRow>;
    create: Create<OutboundNoteRow>;
  };
  osWarehouseOutboundNoteLine?: {
    findMany: FindMany<LineRow>;
    createMany?: CreateMany;
    create?: Create<LineRow>;
  };
};

function asIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function asDate(value: string): Date {
  return new Date(value);
}

function activeAt(effectiveAt: Date | string, endedAt: Date | string | null, asOf: Date): boolean {
  const start = effectiveAt instanceof Date ? effectiveAt : new Date(effectiveAt);
  if (start > asOf) return false;
  if (endedAt == null) return true;
  const end = endedAt instanceof Date ? endedAt : new Date(endedAt);
  return end > asOf;
}

function scopesFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function mapDelivery(row: DeliveryRow): DeliveryRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderId: row.orderId,
    deliveredAt: asIso(row.deliveredAt),
    deliveredTo: row.deliveredTo,
    recordedByMemberId: row.recordedByMemberId,
    source: 'employee_recorded',
    notes: row.notes,
    createdAt: asIso(row.createdAt),
  };
}

function mapDeliveryNote(row: DeliveryNoteRow): DeliveryNoteRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    deliveryId: row.deliveryId,
    orderId: row.orderId,
    documentKind: 'nota_de_entrega',
    numberingPolicy: 'unknown',
    noteNumber: null,
    externalDocumentNumber: row.externalDocumentNumber,
    deliveredAt: asIso(row.deliveredAt),
    bornAt: asIso(row.bornAt),
    claimsInvoice: false,
    claimsTax: false,
    createdAt: asIso(row.createdAt),
  };
}

function mapExit(row: ExitRow): WarehouseExitRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderId: row.orderId,
    exitedAt: asIso(row.exitedAt),
    recordedByMemberId: row.recordedByMemberId,
    source: 'employee_recorded',
    notes: row.notes,
    createdAt: asIso(row.createdAt),
  };
}

function mapOutbound(row: OutboundNoteRow): OutboundNoteRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    warehouseExitId: row.warehouseExitId,
    orderId: row.orderId,
    documentKind: 'nota_de_salida',
    numberingPolicy: 'unknown',
    noteNumber: null,
    externalDocumentNumber: row.externalDocumentNumber,
    exitedAt: asIso(row.exitedAt),
    bornAt: asIso(row.bornAt),
    createdAt: asIso(row.createdAt),
  };
}

function mapLine(row: LineRow, noteId: string): NoteLineRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    noteId,
    orderLineId: row.orderLineId,
    productRef: row.productRef,
    description: row.description,
    quantity: row.quantity,
    unitLabel: row.unitLabel,
  };
}

function mapEvidence(row: EvidenceRow): EvidenceRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    subjectType: row.subjectType as DeliverySubjectType,
    subjectId: row.subjectId,
    role: row.role as EvidenceRecord['role'],
    recordedByMemberId: row.recordedByMemberId,
    reference: row.reference,
    note: row.note,
    paymentState: (row.paymentState as EvidenceRecord['paymentState']) ?? null,
    exceptionReason: row.exceptionReason,
    authorizedByMemberId: row.authorizedByMemberId,
    recipient: row.recipient,
    signatureReference: row.signatureReference,
    confirmedLedgerPayment: false,
    ledgerPosting: 'none',
    signatureMethod: null,
    createdAt: asIso(row.createdAt),
  };
}

async function insertLines(
  delegate: { createMany?: CreateMany; create?: Create<LineRow> } | undefined,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (!delegate || rows.length === 0) return;
  if (delegate.createMany) {
    await delegate.createMany({ data: rows });
    return;
  }
  if (delegate.create) {
    for (const row of rows) {
      await delegate.create({ data: row });
    }
  }
}

/**
 * Prisma-backed DeliveryStore. Customer delivery and warehouse exit paths are
 * prisma_port. Factory delivery note remains BUSINESS_ROLE_REQUIRES_MAPPING.
 */
export function createPrismaDeliveryStore(prisma: DeliveryPrismaPort): DeliveryStore & {
  liveWrite: {
    customerDelivery: typeof CUSTOMER_DELIVERY_PRISMA_LIVE_WRITE;
    warehouseExit: typeof WAREHOUSE_EXIT_LIVE_WRITE;
  };
  warehouseExitWriteAuthority: typeof WAREHOUSE_EXIT_WRITE_AUTHORITY;
  migrationApplied: false;
} {
  return {
    liveWrite: {
      customerDelivery: CUSTOMER_DELIVERY_PRISMA_LIVE_WRITE,
      warehouseExit: WAREHOUSE_EXIT_LIVE_WRITE,
    },
    warehouseExitWriteAuthority: WAREHOUSE_EXIT_WRITE_AUTHORITY,
    migrationApplied: DELIVERY_MIGRATION_APPLIED,

    async getOrderInOrg(organizationId, orderId) {
      if (!organizationId.trim() || !orderId.trim()) return null;
      const row = await prisma.osOrder.findFirst({
        where: { organizationId, id: orderId },
        include: { lines: true },
      });
      if (!row || row.organizationId !== organizationId) return null;
      const lines =
        row.lines?.map((line) => ({
          orderLineId: line.id,
          productRef: line.productRefSnapshot,
          description: line.descriptionSnapshot,
          quantity: line.quantity,
          unitLabel: line.unitLabel,
        })) ?? null;
      const snapshot: OrderSnapshot = {
        id: row.id,
        organizationId: row.organizationId,
        status: row.status,
        lines,
      };
      return snapshot;
    },

    async getMemberInOrg(organizationId, memberId) {
      if (!organizationId.trim() || !memberId.trim()) return null;
      const member = await prisma.osOrganizationMember.findFirst({
        where: { organizationId, id: memberId },
      });
      if (!member || member.organizationId !== organizationId) return null;
      const asOf = new Date();
      const roles = await prisma.osRoleAssignment.findMany({
        where: { organizationId, memberId },
      });
      const scopes = new Set<string>();
      for (const role of roles) {
        if (activeAt(role.effectiveAt, role.endedAt, asOf)) scopes.add(role.roleKey);
      }
      if (prisma.osDelegation) {
        const delegations = await prisma.osDelegation.findMany({
          where: { organizationId, delegateMemberId: memberId },
        });
        for (const delegation of delegations) {
          if (delegation.revokedAt) continue;
          const starts = delegation.startsAt instanceof Date ? delegation.startsAt : new Date(delegation.startsAt);
          const expires = delegation.expiresAt instanceof Date ? delegation.expiresAt : new Date(delegation.expiresAt);
          if (starts > asOf || expires <= asOf) continue;
          for (const scope of scopesFromJson(delegation.scopesJson)) scopes.add(scope);
        }
      }
      const snapshot: MemberSnapshot = {
        id: member.id,
        organizationId: member.organizationId,
        accessStatus: member.accessStatus,
        grantedScopes: [...scopes],
      };
      return snapshot;
    },

    async insertWarehouseExit(row) {
      if (!prisma.osWarehouseExit) throw new Error('WAREHOUSE_EXIT_STORE_UNAVAILABLE');
      await prisma.osWarehouseExit.create({
        data: {
          id: row.id,
          organizationId: row.organizationId,
          orderId: row.orderId,
          exitedAt: asDate(row.exitedAt),
          recordedByMemberId: row.recordedByMemberId,
          source: row.source,
          notes: row.notes,
          createdAt: asDate(row.createdAt),
        },
      });
    },

    async insertOutboundNote(row) {
      if (!prisma.osWarehouseOutboundNote) throw new Error('WAREHOUSE_EXIT_STORE_UNAVAILABLE');
      await prisma.osWarehouseOutboundNote.create({
        data: {
          id: row.id,
          organizationId: row.organizationId,
          warehouseExitId: row.warehouseExitId,
          orderId: row.orderId,
          documentKind: row.documentKind,
          numberingPolicy: row.numberingPolicy,
          externalDocumentNumber: row.externalDocumentNumber,
          exitedAt: asDate(row.exitedAt),
          bornAt: asDate(row.bornAt),
          createdAt: asDate(row.createdAt),
        },
      });
    },

    async insertOutboundLines(rows) {
      await insertLines(
        prisma.osWarehouseOutboundNoteLine,
        rows.map((row) => ({
          id: row.id,
          organizationId: row.organizationId,
          outboundNoteId: row.noteId,
          orderLineId: row.orderLineId,
          productRef: row.productRef,
          description: row.description,
          quantity: row.quantity,
          unitLabel: row.unitLabel,
        })),
      );
    },

    async insertDelivery(row) {
      await prisma.osDelivery.create({
        data: {
          id: row.id,
          organizationId: row.organizationId,
          orderId: row.orderId,
          deliveredAt: asDate(row.deliveredAt),
          deliveredTo: row.deliveredTo,
          recordedByMemberId: row.recordedByMemberId,
          source: row.source,
          notes: row.notes,
          createdAt: asDate(row.createdAt),
        },
      });
    },

    async insertDeliveryNote(row) {
      await prisma.osDeliveryNote.create({
        data: {
          id: row.id,
          organizationId: row.organizationId,
          deliveryId: row.deliveryId,
          orderId: row.orderId,
          documentKind: row.documentKind,
          numberingPolicy: row.numberingPolicy,
          externalDocumentNumber: row.externalDocumentNumber,
          deliveredAt: asDate(row.deliveredAt),
          bornAt: asDate(row.bornAt),
          createdAt: asDate(row.createdAt),
        },
      });
    },

    async insertDeliveryNoteLines(rows) {
      await insertLines(
        prisma.osDeliveryNoteLine,
        rows.map((row) => ({
          id: row.id,
          organizationId: row.organizationId,
          deliveryNoteId: row.noteId,
          orderLineId: row.orderLineId,
          productRef: row.productRef,
          description: row.description,
          quantity: row.quantity,
          unitLabel: row.unitLabel,
        })),
      );
    },

    async insertEvidence(row) {
      await prisma.osDeliveryEvidence.create({
        data: {
          id: row.id,
          organizationId: row.organizationId,
          subjectType: row.subjectType,
          subjectId: row.subjectId,
          role: row.role,
          recordedByMemberId: row.recordedByMemberId,
          reference: row.reference,
          note: row.note,
          paymentState: row.paymentState,
          exceptionReason: row.exceptionReason,
          authorizedByMemberId: row.authorizedByMemberId,
          recipient: row.recipient,
          signatureReference: row.signatureReference,
          confirmedLedgerPayment: false,
          ledgerPosting: 'none',
          createdAt: asDate(row.createdAt),
        },
      });
    },

    async listWarehouseExits(organizationId, orderId) {
      if (!prisma.osWarehouseExit) return [];
      const rows = await prisma.osWarehouseExit.findMany({
        where: { organizationId, orderId },
      });
      return rows.map(mapExit);
    },

    async getWarehouseExit(organizationId, warehouseExitId) {
      if (!prisma.osWarehouseExit) return null;
      const row = await prisma.osWarehouseExit.findFirst({
        where: { organizationId, id: warehouseExitId },
      });
      return row ? mapExit(row) : null;
    },

    async getOutboundNote(organizationId, warehouseExitId) {
      if (!prisma.osWarehouseOutboundNote) return null;
      const row = await prisma.osWarehouseOutboundNote.findFirst({
        where: { organizationId, warehouseExitId },
      });
      return row ? mapOutbound(row) : null;
    },

    async listDeliveries(organizationId, orderId) {
      const rows = await prisma.osDelivery.findMany({
        where: { organizationId, orderId },
      });
      return rows.map(mapDelivery);
    },

    async getDelivery(organizationId, deliveryId) {
      const row = await prisma.osDelivery.findFirst({
        where: { organizationId, id: deliveryId },
      });
      return row ? mapDelivery(row) : null;
    },

    async getDeliveryNote(organizationId, deliveryId) {
      const row = await prisma.osDeliveryNote.findFirst({
        where: { organizationId, deliveryId },
      });
      return row ? mapDeliveryNote(row) : null;
    },

    async listDeliveryNotes(organizationId, orderId) {
      const rows = await prisma.osDeliveryNote.findMany({
        where: { organizationId, orderId },
      });
      return rows.map(mapDeliveryNote);
    },

    async listOutboundLines(organizationId, noteId) {
      if (!prisma.osWarehouseOutboundNoteLine) return [];
      const rows = await prisma.osWarehouseOutboundNoteLine.findMany({
        where: { organizationId, outboundNoteId: noteId },
      });
      return rows.map((row) => mapLine(row, noteId));
    },

    async listDeliveryNoteLines(organizationId, noteId) {
      const rows = await prisma.osDeliveryNoteLine.findMany({
        where: { organizationId, deliveryNoteId: noteId },
      });
      return rows.map((row) => mapLine(row, noteId));
    },

    async listEvidence(organizationId, subjectType, subjectId) {
      const rows = await prisma.osDeliveryEvidence.findMany({
        where: { organizationId, subjectType, subjectId },
      });
      return rows.map(mapEvidence);
    },

    async listAllWarehouseExits(organizationId) {
      if (!prisma.osWarehouseExit) return [];
      const rows = await prisma.osWarehouseExit.findMany({ where: { organizationId } });
      return rows.map(mapExit);
    },

    async listAllDeliveries(organizationId) {
      const rows = await prisma.osDelivery.findMany({ where: { organizationId } });
      return rows.map(mapDelivery);
    },

    async listAllDeliveryNotes(organizationId) {
      const rows = await prisma.osDeliveryNote.findMany({ where: { organizationId } });
      return rows.map(mapDeliveryNote);
    },

    async getDeliveryNoteById(organizationId, noteId) {
      const row = await prisma.osDeliveryNote.findFirst({
        where: { organizationId, id: noteId },
      });
      return row ? mapDeliveryNote(row) : null;
    },

    async listRecipientCandidates(organizationId) {
      const deliveries = await prisma.osDelivery.findMany({ where: { organizationId } });
      const evidence = await prisma.osDeliveryEvidence.findMany({ where: { organizationId } });
      const candidates: RecipientCandidate[] = [];
      for (const row of deliveries) {
        if (row.deliveredTo) {
          candidates.push({ organizationId: row.organizationId, recipient: row.deliveredTo });
        }
      }
      for (const row of evidence) {
        if (row.recipient) {
          candidates.push({ organizationId: row.organizationId, recipient: row.recipient });
        }
      }
      return candidates;
    },
  };
}

export type PrismaDeliveryStore = ReturnType<typeof createPrismaDeliveryStore>;
