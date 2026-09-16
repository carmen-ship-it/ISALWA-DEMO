import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OPERATIONS_ACCESS_SCOPE_KEYS } from '@isalwa/os-contracts';
import {
  CUSTOMER_DELIVERY_RECORD_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
} from '@isalwa/os-contracts';
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
  partyId: string;
  orderNumber: string;
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
  exits: Array<{
    id: string;
    organizationId: string;
    orderId: string;
    deliveryNoteId: string | null;
    exitedAt: Date | string;
    recordedByMemberId: string;
    source: string;
    notes: string | null;
    createdAt: Date | string;
  }>;
  outboundNotes: Array<{
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
    noteNumber?: null;
  }>;
  outboundLines: NoteLineRecord[];
  exitCreates: number;
} {
  const orders = seed?.orders ?? [
    {
      id: 'order-a',
      organizationId: 'org-a',
      partyId: 'party-a',
      orderNumber: 'PED-A',
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
      partyId: 'party-b',
      orderNumber: 'PED-B',
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
  const exits: Array<{
    id: string;
    organizationId: string;
    orderId: string;
    deliveryNoteId: string | null;
    exitedAt: Date | string;
    recordedByMemberId: string;
    source: string;
    notes: string | null;
    createdAt: Date | string;
  }> = [];
  const outboundNotes: Array<{
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
    noteNumber?: null;
  }> = [];
  const outboundLines: NoteLineRecord[] = [];
  let exitCreates = 0;

  return {
    deliveries,
    notes,
    lines,
    evidence,
    exits,
    outboundNotes,
    outboundLines,
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
          deliveryNoteId: (data.deliveryNoteId as string | null) ?? null,
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
              deliveredAt: row.deliveredAt ? new Date(row.deliveredAt) : null,
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
            deliveredAt: row.deliveredAt ? new Date(row.deliveredAt) : null,
            bornAt: new Date(row.bornAt),
            createdAt: new Date(row.createdAt),
          }));
      },
      async update(args) {
        const where = args.where as { id: string; organizationId?: string };
        const data = args.data as Record<string, unknown>;
        const idx = notes.findIndex((n) => n.id === where.id);
        if (idx < 0) throw new Error('NOT_FOUND');
        notes[idx] = { ...notes[idx], ...(data as Partial<DeliveryNoteRecord>) } as DeliveryNoteRecord;
        if (data.deliveredAt) notes[idx].deliveredAt = asIso(data.deliveredAt);
        return { ...notes[idx], deliveredAt: notes[idx].deliveredAt ? new Date(notes[idx].deliveredAt) : null, bornAt: new Date(notes[idx].bornAt), createdAt: new Date(notes[idx].createdAt) };
      },
      async create(args) {
        const data = args.data as Record<string, unknown>;
        const row: DeliveryNoteRecord = {
          id: String(data.id),
          organizationId: String(data.organizationId),
          deliveryId: (data.deliveryId as string | null) ?? null,
          orderId: String(data.orderId),
          partyId: String(data.partyId ?? 'party-a'),
          documentKind: 'nota_de_entrega',
          numberingPolicy: (data.numberingPolicy as 'provisional_internal' | 'unknown') ?? 'provisional_internal',
          noteNumber: null,
          internalDocumentRef: String(data.internalDocumentRef ?? `NE-PILOT-${data.id}`),
          displayDocumentNumber: (data.displayDocumentNumber as string | null) ?? null,
          externalDocumentNumber: (data.externalDocumentNumber as string | null) ?? null,
          status: (data.status as 'issued' | 'reversed') ?? 'issued',
          recipient: String(data.recipient ?? '—'),
          deliveredBy: String(data.deliveredBy ?? '—'),
          receivedBy: (data.receivedBy as string | null) ?? null,
          observations: (data.observations as string | null) ?? null,
          locationId: (data.locationId as string | null) ?? null,
          createdByMemberId: String(data.createdByMemberId ?? 'member-a'),
          correctsNoteId: (data.correctsNoteId as string | null) ?? null,
          supersedesNoteId: (data.supersedesNoteId as string | null) ?? null,
          correctionReason: (data.correctionReason as string | null) ?? null,
          deliveredAt: data.deliveredAt ? asIso(data.deliveredAt) : null,
          bornAt: asIso(data.bornAt),
          claimsInvoice: false,
          claimsTax: false,
          createdAt: asIso(data.createdAt),
        };
        notes.push(row);
        return {
          ...row,
          deliveredAt: row.deliveredAt ? new Date(row.deliveredAt) : null,
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
      async findFirst(args) {
        const where = args.where as Record<string, string>;
        return (
          exits.find((item) =>
            Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
          ) ?? null
        );
      },
      async findMany(args) {
        const where = args.where as Record<string, string>;
        return exits.filter((item) =>
          Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
        );
      },
      async create(args) {
        exitCreates += 1;
        const data = args.data as Record<string, unknown>;
        const row = {
          id: String(data.id),
          organizationId: String(data.organizationId),
          orderId: String(data.orderId),
          deliveryNoteId: (data.deliveryNoteId as string | null) ?? null,
          exitedAt: data.exitedAt as Date | string,
          recordedByMemberId: String(data.recordedByMemberId),
          source: String(data.source),
          notes: (data.notes as string | null) ?? null,
          createdAt: data.createdAt as Date | string,
        };
        exits.push(row);
        return row;
      },
    },
    osWarehouseOutboundNote: {
      async findFirst(args) {
        const where = args.where as Record<string, string>;
        return (
          outboundNotes.find((item) =>
            Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
          ) ?? null
        );
      },
      async findMany(args) {
        const where = args.where as Record<string, string>;
        return outboundNotes.filter((item) =>
          Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
        );
      },
      async create(args) {
        const data = args.data as Record<string, unknown>;
        const row = {
          id: String(data.id),
          organizationId: String(data.organizationId),
          warehouseExitId: String(data.warehouseExitId),
          orderId: String(data.orderId),
          documentKind: String(data.documentKind),
          numberingPolicy: String(data.numberingPolicy),
          externalDocumentNumber: (data.externalDocumentNumber as string | null) ?? null,
          exitedAt: data.exitedAt as Date | string,
          bornAt: data.bornAt as Date | string,
          createdAt: data.createdAt as Date | string,
          noteNumber: null as null,
        };
        outboundNotes.push(row);
        return row;
      },
    },
    osWarehouseOutboundNoteLine: {
      async findMany(args) {
        const where = args.where as Record<string, string>;
        return outboundLines.filter((item) =>
          Object.entries(where).every(([key, value]) => (item as Record<string, unknown>)[key] === value),
        );
      },
      async createMany(args) {
        for (const data of args.data) {
          outboundLines.push({
            id: String(data.id),
            organizationId: String(data.organizationId),
            noteId: String(data.outboundNoteId),
            orderLineId: String(data.orderLineId),
            productRef: (data.productRef as string | null) ?? null,
            description: String(data.description),
            quantity: Number(data.quantity),
            unitLabel: (data.unitLabel as string | null) ?? null,
          });
        }
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
  it('marks customer delivery and warehouse exit as prisma_port with outbound registered', () => {
    assert.equal(DELIVERY_LIVE_WRITE, 'UNPROVEN');
    assert.equal(CUSTOMER_DELIVERY_PRISMA_LIVE_WRITE, 'prisma_port');
    assert.equal(WAREHOUSE_EXIT_LIVE_WRITE, 'prisma_port');
    assert.equal(WAREHOUSE_EXIT_WRITE_AUTHORITY, 'REGISTERED');
    assert.equal(DELIVERY_MIGRATION_APPLIED, false);
    assert.equal((OPERATIONS_ACCESS_SCOPE_KEYS as readonly string[]).includes(WAREHOUSE_EXIT_RECORD_SCOPE), true);
    assert.equal((OPERATIONS_ACCESS_SCOPE_KEYS as readonly string[]).includes(CUSTOMER_DELIVERY_RECORD_SCOPE), true);

    const store = createPrismaDeliveryStore(fakePrisma());
    assert.equal(store.liveWrite.customerDelivery, 'prisma_port');
    assert.equal(store.liveWrite.warehouseExit, 'prisma_port');
    assert.equal(store.warehouseExitWriteAuthority, 'REGISTERED');
    assert.equal(store.migrationApplied, false);
  });

  it('persists customer delivery without auto-creating a nota; CreateNota creates provisional note', async () => {
    const prisma = fakePrisma();
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);

    const nota = await service.createNotaDeEntrega(ctx(), {
      orderId: 'order-a',
      recipient: 'Local',
      deliveredBy: 'Chofer',
      recordedBy: 'member-a',
      source: 'employee_recorded',
      quantities: [{ orderLineId: 'line-1', quantity: 1 }],
    });
    assert.equal(nota.documentKind, 'nota_de_entrega');
    assert.equal(nota.numberingPolicy, 'provisional_internal');
    assert.match(nota.internalDocumentRef, /^NE-PILOT-/);
    assert.equal(nota.receivedBy, null);
    assert.equal(prisma.notes.length, 1);
    assert.equal(prisma.lines.length, 1);

    const first = await service.recordCustomerDelivery(ctx(), {
      orderId: 'order-a',
      deliveredAt: DELIVERED_AT,
      deliveredTo: 'Local',
      recordedBy: 'member-a',
      source: 'employee_recorded',
      externalDocumentNumber: '007189',
      quantities: [{ orderLineId: 'line-1', quantity: 1 }],
      deliveryNoteId: nota.deliveryNoteId,
    });
    assert.equal(first.documentKind, null);
    assert.equal(first.deliveryNoteId, nota.deliveryNoteId);
    assert.equal(first.deliveredAt, DELIVERED_AT);
    assert.equal(first.claimsInvoice, false);
    assert.equal(first.lineCount, 1);
    assert.equal(prisma.deliveries.length, 1);
    assert.equal(prisma.notes.length, 1);
    assert.equal(prisma.notes[0]?.receivedBy, 'Local');

    const second = await service.recordCustomerDelivery(ctx(), {
      orderId: 'order-a',
      deliveredAt: '2026-09-14T14:30:00.000Z',
      recordedBy: 'member-a',
      source: 'employee_recorded',
      quantities: [{ orderLineId: 'line-1', quantity: 2 }],
    });
    assert.equal(second.lineCount, 1);
    assert.equal(prisma.deliveries.length, 2);
    assert.equal(prisma.notes.length, 1);
    assert.equal(store.liveWrite.customerDelivery, 'prisma_port');
  });

  it('does not invent a note number and refuses silent create-before-delivery helper', async () => {
    const prisma = fakePrisma();
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);
    assert.throws(() => service.createNoteBeforeDelivery(), /USE_CREATE_NOTA/);

    const result = await service.createNotaDeEntrega(ctx(), {
      orderId: 'order-a',
      recipient: 'Local',
      deliveredBy: 'Chofer',
      recordedBy: 'member-a',
      source: 'employee_recorded',
    });
    assert.equal(result.noteNumber, null);
    assert.equal(result.numberingPolicy, 'provisional_internal');
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
    assert.equal(store.liveWrite.warehouseExit, 'prisma_port');
  });

  it('persists partial and multiple warehouse exits as nota_de_salida without inventing a number', async () => {
    const prisma = fakePrisma({
      roles: [{ organizationId: 'org-a', memberId: 'member-a', roleKey: WAREHOUSE_EXIT_RECORD_SCOPE }],
    });
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);
    const exitedAt = '2026-09-14T13:00:00.000Z';

    const first = await service.recordWarehouseExit(ctx(), {
      orderId: 'order-a',
      exitedAt,
      recordedBy: 'member-a',
      source: 'employee_recorded',
      externalDocumentNumber: 'SAL-009',
      quantities: [{ orderLineId: 'line-1', quantity: 1 }],
    });
    assert.equal(first.documentKind, 'nota_de_salida');
    assert.equal(first.noteNumber, null);
    assert.equal(first.externalDocumentNumber, 'SAL-009');
    assert.equal(first.deliveryNoteId, null);
    assert.equal(first.customerDeliveryId, null);
    assert.equal(prisma.exits.length, 1);
    assert.equal(prisma.outboundNotes.length, 1);
    assert.equal(prisma.outboundLines.length, 1);
    assert.equal(prisma.outboundNotes[0]?.externalDocumentNumber, 'SAL-009');
    assert.equal(prisma.outboundNotes[0]?.noteNumber, null);

    const second = await service.recordWarehouseExit(ctx(), {
      orderId: 'order-a',
      exitedAt: '2026-09-14T13:30:00.000Z',
      recordedBy: 'member-a',
      source: 'employee_recorded',
      quantities: [{ orderLineId: 'line-1', quantity: 2 }],
    });
    assert.equal(second.lineCount, 1);
    assert.equal(prisma.exits.length, 2);
    assert.equal(prisma.outboundNotes.length, 2);
    assert.equal(prisma.outboundLines.length, 2);
    assert.equal(store.liveWrite.warehouseExit, 'prisma_port');
  });

  it('denies warehouse exit without outbound scope and does not mutate or invent delivery', async () => {
    const prisma = fakePrisma({
      roles: [
        { organizationId: 'org-a', memberId: 'member-a', roleKey: CUSTOMER_DELIVERY_RECORD_SCOPE },
        { organizationId: 'org-a', memberId: 'member-a', roleKey: 'warehouse.finished_goods.receive' },
        { organizationId: 'org-a', memberId: 'member-a', roleKey: 'warehouse.finished_goods.allocate' },
        { organizationId: 'org-a', memberId: 'member-a', roleKey: 'commercial.team.read' },
        { organizationId: 'org-a', memberId: 'member-a', roleKey: 'people.admin' },
      ],
    });
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () =>
        service.recordWarehouseExit(ctx(), {
          orderId: 'order-a',
          exitedAt: '2026-09-14T13:00:00.000Z',
          recordedBy: 'member-a',
          source: 'employee_recorded',
          quantities: [{ orderLineId: 'line-1', quantity: 1 }],
        }),
      /PERMISSION_DENIED/,
    );
    assert.equal(prisma.exitCreates, 0);
    assert.equal(prisma.exits.length, 0);
    assert.equal(prisma.outboundNotes.length, 0);
    assert.equal(prisma.deliveries.length, 0);
  });

  it('treats a foreign order warehouse exit as not_found without leaking org-b', async () => {
    const prisma = fakePrisma({
      roles: [{ organizationId: 'org-a', memberId: 'member-a', roleKey: WAREHOUSE_EXIT_RECORD_SCOPE }],
    });
    const store = createPrismaDeliveryStore(prisma);
    const service = new DeliveryCommandService(store);
    await assert.rejects(
      () =>
        service.recordWarehouseExit(ctx(), {
          orderId: 'order-b',
          exitedAt: '2026-09-14T13:00:00.000Z',
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
    assert.equal(prisma.exitCreates, 0);
    assert.equal(prisma.exits.length, 0);
  });
});
