import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OPERATIONS_ACCESS_SCOPE_KEYS } from '../../os-contracts/src/operations-scopes';
import {
  CUSTOMER_DELIVERY_RECORD_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
} from '../../os-contracts/src/delivery';
import { DeliveryCommandService, DELIVERY_LIVE_WRITE } from './delivery-command-service';
import {
  CUSTOMER_DELIVERY_PRISMA_LIVE_WRITE,
  DELIVERY_MIGRATION_APPLIED,
  WAREHOUSE_EXIT_LIVE_WRITE,
  WAREHOUSE_EXIT_WRITE_AUTHORITY,
  createPrismaDeliveryStore,
  type DeliveryPrismaPort,
} from './prisma-store';
import type {
  DeliveryNoteRecord,
  DeliveryRecord,
  EvidenceRecord,
  NoteLineRecord,
} from './store-types';

const NOW = new Date('2026-09-14T15:00:00.000Z');
const DELIVERED_AT = '2026-09-14T14:00:00.000Z';
const FOREIGN_SECRET = 'cliente-org-b-secreto';

type OrderRow = {
  id: string;
  organizationId: string;
  status: string;
  lines: Array<{
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

function fakePrisma(seed?: {
  orders?: OrderRow[];
  members?: MemberRow[];
  roles?: Array<{ organizationId: string; memberId: string; roleKey: string }>;
}): DeliveryPrismaPort & {
  deliveries: DeliveryRecord[];
  notes: DeliveryNoteRecord[];
  lines: NoteLineRecord[];
  evidence: EvidenceRecord[];
  exitCreates: number;
} {
  const orders = seed?.orders ?? [
    {
      id: 'order-a',
      organizationId: 'org-a',
      status: 'open',
      lines: [
        {
          id: 'line-1',
          descriptionSnapshot: 'Plato',
          quantity: 4,
          unitLabel: 'u',
          productRefSnapshot: 'prod-1',
        },
      ],
    },
    {
      id: 'order-b',
      organizationId: 'org-b',
      status: 'open',
      lines: [
        {
          id: 'line-b',
          descriptionSnapshot: FOREIGN_SECRET,
          quantity: 2,
          unitLabel: null,
          productRefSnapshot: null,
        },
      ],
    },
  ];
  const members = seed?.members ?? [
    { id: 'member-a', organizationId: 'org-a', accessStatus: 'active' },
  ];
  const roles = seed?.roles ?? [
    { organizationId: 'org-a', memberId: 'member-a', roleKey: CUSTOMER_DELIVERY_RECORD_SCOPE },
  ];
  const deliveries: DeliveryRecord[] = [];
  const notes: DeliveryNoteRecord[] = [];
  const lines: NoteLineRecord[] = [];
  const evidence: EvidenceRecord[] = [];
  let exitCreates = 0;

  return {
    deliveries,
    notes,
    lines,
    evidence,
    get exitCreates() {
      return exitCreates;
    },
    osOrder: {
      async findFirst(args) {
        const where = args.where as { organizationId: string; id: string };
        const row = orders.find((item) => item.organizationId === where.organizationId && item.id === where.id);
        return row ?? null;
      },
    },
    osOrganizationMember: {
      async findFirst(args) {
        const where = args.where as { organizationId: string; id: string };
        return members.find((item) => item.organizationId === where.organizationId && item.id === where.id) ?? null;
      },
    },
    osRoleAssignment: {
      async findMany(args) {
        const where = args.where as { organizationId: string; memberId: string };
        return roles
          .filter((row) => row.organizationId === where.organizationId && row.memberId === where.memberId)
          .map((row) => ({
            roleKey: row.roleKey,
            effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
            endedAt: null,
          }));
      },
    },
    osDelivery: {
      async findFirst(args) {
        const where = args.where as Record<string, string>;
        const row = deliveries.find((item) =>
          Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
        );
        return row
          ? {
              ...row,
              deliveredAt: new Date(row.deliveredAt),
              createdAt: new Date(row.createdAt),
            }
          : null;
      },
      async findMany(args) {
        const where = args.where as Record<string, string>;
        return deliveries
          .filter((item) =>
            Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
          )
          .map((row) => ({
            ...row,
            deliveredAt: new Date(row.deliveredAt),
            createdAt: new Date(row.createdAt),
          }));
      },
      async create(args) {
        const data = args.data as Record<string, unknown>;
        const row: DeliveryRecord = {
          id: String(data.id),
          organizationId: String(data.organizationId),
          orderId: String(data.orderId),
          deliveredAt: asIso(data.deliveredAt),
          deliveredTo: (data.deliveredTo as string | null) ?? null,
          recordedByMemberId: String(data.recordedByMemberId),
          source: 'employee_recorded',
          notes: (data.notes as string | null) ?? null,
          createdAt: asIso(data.createdAt),
        };
        deliveries.push(row);
        return {
          ...row,
          deliveredAt: new Date(row.deliveredAt),
          createdAt: new Date(row.createdAt),
        };
      },
    },
    osDeliveryNote: {
      async findFirst(args) {
        const where = args.where as Record<string, string>;
        const row = notes.find((item) =>
          Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
        );
        return row
          ? {
              ...row,
              deliveredAt: new Date(row.deliveredAt),
              bornAt: new Date(row.bornAt),
              createdAt: new Date(row.createdAt),
            }
          : null;
      },
      async findMany(args) {
        const where = args.where as Record<string, string>;
        return notes
          .filter((item) =>
            Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
          )
          .map((row) => ({
            ...row,
            deliveredAt: new Date(row.deliveredAt),
            bornAt: new Date(row.bornAt),
            createdAt: new Date(row.createdAt),
          }));
      },
      async create(args) {
        const data = args.data as Record<string, unknown>;
        const row: DeliveryNoteRecord = {
          id: String(data.id),
          organizationId: String(data.organizationId),
          deliveryId: String(data.deliveryId),
          orderId: String(data.orderId),
          documentKind: 'nota_de_entrega',
          numberingPolicy: 'unknown',
          noteNumber: null,
          externalDocumentNumber: (data.externalDocumentNumber as string | null) ?? null,
          deliveredAt: asIso(data.deliveredAt),
          bornAt: asIso(data.bornAt),
          claimsInvoice: false,
          claimsTax: false,
          createdAt: asIso(data.createdAt),
        };
        notes.push(row);
        return {
          ...row,
          deliveredAt: new Date(row.deliveredAt),
          bornAt: new Date(row.bornAt),
          createdAt: new Date(row.createdAt),
        };
      },
    },
    osDeliveryNoteLine: {
      async findMany(args) {
        const where = args.where as { organizationId: string; deliveryNoteId: string };
        return lines
          .filter((row) => row.organizationId === where.organizationId && row.noteId === where.deliveryNoteId)
          .map((row) => ({
            id: row.id,
            organizationId: row.organizationId,
            deliveryNoteId: row.noteId,
            orderLineId: row.orderLineId,
            productRef: row.productRef,
            description: row.description,
            quantity: row.quantity,
            unitLabel: row.unitLabel,
          }));
      },
      async createMany(args) {
        for (const data of args.data) {
          lines.push({
            id: String(data.id),
            organizationId: String(data.organizationId),
            noteId: String(data.deliveryNoteId),
            orderLineId: String(data.orderLineId),
            productRef: (data.productRef as string | null) ?? null,
            description: String(data.description),
            quantity: Number(data.quantity),
            unitLabel: (data.unitLabel as string | null) ?? null,
          });
        }
      },
    },
    osDeliveryEvidence: {
      async findMany(args) {
        const where = args.where as Record<string, string>;
        return evidence
          .filter((item) =>
            Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
          )
          .map((row) => ({
            ...row,
            createdAt: new Date(row.createdAt),
          }));
      },
      async create(args) {
        const data = args.data as Record<string, unknown>;
        const row: EvidenceRecord = {
          id: String(data.id),
          organizationId: String(data.organizationId),
          subjectType: data.subjectType as EvidenceRecord['subjectType'],
          subjectId: String(data.subjectId),
          role: data.role as EvidenceRecord['role'],
          recordedByMemberId: String(data.recordedByMemberId),
          reference: (data.reference as string | null) ?? null,
          note: (data.note as string | null) ?? null,
          paymentState: (data.paymentState as EvidenceRecord['paymentState']) ?? null,
          exceptionReason: (data.exceptionReason as string | null) ?? null,
          authorizedByMemberId: (data.authorizedByMemberId as string | null) ?? null,
          recipient: (data.recipient as string | null) ?? null,
          signatureReference: (data.signatureReference as string | null) ?? null,
          confirmedLedgerPayment: false,
          ledgerPosting: 'none',
          signatureMethod: null,
          createdAt: asIso(data.createdAt),
        };
        evidence.push(row);
        return { ...row, createdAt: new Date(row.createdAt) };
      },
    },
    osWarehouseExit: {
      async findFirst() {
        return null;
      },
      async findMany() {
        return [];
      },
      async create() {
        exitCreates += 1;
        throw new Error('should not claim REAL_PERSISTENT for exit');
      },
    },
  };
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  return NOW.toISOString();
}

function ctx() {
  return { organizationId: 'org-a', actorMemberId: 'member-a', effectiveAt: NOW };
}

describe('createPrismaDeliveryStore', () => {
  it('marks customer delivery prisma_port and keeps warehouse exit AUTHORITY_BLOCKED', () => {
    assert.equal(DELIVERY_LIVE_WRITE, 'UNPROVEN');
    assert.equal(CUSTOMER_DELIVERY_PRISMA_LIVE_WRITE, 'prisma_port');
    assert.equal(WAREHOUSE_EXIT_LIVE_WRITE, 'AUTHORITY_BLOCKED');
    assert.equal(WAREHOUSE_EXIT_WRITE_AUTHORITY, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(DELIVERY_MIGRATION_APPLIED, false);
    assert.equal((OPERATIONS_ACCESS_SCOPE_KEYS as readonly string[]).includes(WAREHOUSE_EXIT_RECORD_SCOPE), false);
    assert.equal((OPERATIONS_ACCESS_SCOPE_KEYS as readonly string[]).includes(CUSTOMER_DELIVERY_RECORD_SCOPE), true);

    const store = createPrismaDeliveryStore(fakePrisma());
    assert.equal(store.liveWrite.customerDelivery, 'prisma_port');
    assert.equal(store.liveWrite.warehouseExit, 'AUTHORITY_BLOCKED');
    assert.equal(store.warehouseExitWriteAuthority, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(store.migrationApplied, false);
  });

  it('persists partial and multiple customer deliveries with note born at delivery', async () => {
    const prisma = fakePrisma();
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);

    const first = await service.recordCustomerDelivery(ctx(), {
      orderId: 'order-a',
      deliveredAt: DELIVERED_AT,
      recordedBy: 'member-a',
      source: 'employee_recorded',
      externalDocumentNumber: '007189',
      quantities: [{ orderLineId: 'line-1', quantity: 1 }],
    });
    assert.equal(first.documentKind, 'nota_de_entrega');
    assert.equal(first.noteNumber, null);
    assert.equal(first.externalDocumentNumber, '007189');
    assert.equal(first.bornAt, DELIVERED_AT);
    assert.equal(first.deliveredAt, DELIVERED_AT);
    assert.equal(first.claimsInvoice, false);
    assert.equal(first.lineCount, 1);
    assert.equal(prisma.deliveries.length, 1);
    assert.equal(prisma.notes.length, 1);
    assert.equal(prisma.lines.length, 1);
    assert.equal(prisma.notes[0]?.externalDocumentNumber, '007189');
    assert.equal(prisma.notes[0]?.bornAt, DELIVERED_AT);

    const second = await service.recordCustomerDelivery(ctx(), {
      orderId: 'order-a',
      deliveredAt: '2026-09-14T14:30:00.000Z',
      recordedBy: 'member-a',
      source: 'employee_recorded',
      quantities: [{ orderLineId: 'line-1', quantity: 2 }],
    });
    assert.equal(second.lineCount, 1);
    assert.equal(prisma.deliveries.length, 2);
    assert.equal(prisma.notes.length, 2);
    assert.equal(store.liveWrite.customerDelivery, 'prisma_port');
  });

  it('does not invent a note number and rejects a note that would predate delivery', async () => {
    const prisma = fakePrisma();
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);
    assert.throws(() => service.createNoteBeforeDelivery(), /DELIVERY_REQUIRED/);

    const result = await service.recordCustomerDelivery(ctx(), {
      orderId: 'order-a',
      deliveredAt: DELIVERED_AT,
      recordedBy: 'member-a',
      source: 'employee_recorded',
      externalDocumentNumber: '007189',
    });
    assert.equal(result.noteNumber, null);
    assert.equal(result.numberingPolicy, 'unknown');
    assert.equal(prisma.notes[0]?.noteNumber, null);
  });

  it('treats a foreign order as not_found without leaking org-b and does not insert', async () => {
    const prisma = fakePrisma();
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () =>
        service.recordCustomerDelivery(ctx(), {
          orderId: 'order-b',
          deliveredAt: DELIVERED_AT,
          recordedBy: 'member-a',
          source: 'employee_recorded',
        }),
      (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        assert.equal(message, 'NOT_FOUND');
        assert.equal(message.includes(FOREIGN_SECRET), false);
        assert.equal(message.includes('org-b'), false);
        return true;
      },
    );
    assert.equal(prisma.deliveries.length, 0);
    assert.equal(prisma.notes.length, 0);
  });

  it('does not let warehouse.outbound.record alone authorize customer delivery', async () => {
    const prisma = fakePrisma({
      roles: [{ organizationId: 'org-a', memberId: 'member-a', roleKey: WAREHOUSE_EXIT_RECORD_SCOPE }],
    });
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () =>
        service.recordCustomerDelivery(ctx(), {
          orderId: 'order-a',
          deliveredAt: DELIVERED_AT,
          recordedBy: 'member-a',
          source: 'employee_recorded',
        }),
      /PERMISSION_DENIED/,
    );
    assert.equal(prisma.deliveries.length, 0);
    assert.equal(store.liveWrite.warehouseExit, 'AUTHORITY_BLOCKED');
  });

  it('does not claim REAL_PERSISTENT for warehouse exit even when insert helpers exist', async () => {
    const prisma = fakePrisma();
    const store = createPrismaDeliveryStore(prisma);
    assert.notEqual(store.liveWrite.warehouseExit, 'prisma_port');
    assert.notEqual(store.liveWrite.warehouseExit, 'REAL_PERSISTENT');
    assert.equal(store.liveWrite.warehouseExit, 'AUTHORITY_BLOCKED');
    assert.equal(JSON.stringify(store.liveWrite).includes('REAL_PERSISTENT'), false);
    assert.equal(prisma.exitCreates, 0);
  });
});
