/**
 * D3 / D5 over the Prisma DeliveryStore port, using a disposable in-process fake client.
 *
 * The fake models only what the service relies on: an interactive transaction with an undo
 * log (rollback), and `SELECT … FOR UPDATE` as a per-key lock held until the transaction ends.
 * It is NOT Postgres. That the real client honours the same contract (row lock on os_orders,
 * rollback on throw) is UNPROVEN here; no database connection is made.
 *
 * ADR 0003 (V1 delivery quantities) is referenced where a rule is encoded.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CUSTOMER_DELIVERY_RECORD_SCOPE, WAREHOUSE_EXIT_RECORD_SCOPE } from '@isalwa/os-contracts';
import { DeliveryCommandService } from './delivery-command-service';
import { createPrismaDeliveryStore, type DeliveryPrismaPort } from './prisma-store';

type Row = Record<string, unknown>;

const NOW = new Date('2026-09-14T15:00:00.000Z');

function matches(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      const spec = expected as { in?: unknown[]; gt?: Date };
      if (spec.in) return spec.in.includes(row[key]);
      if (spec.gt) return (row[key] as Date) > spec.gt;
    }
    return row[key] === expected;
  });
}

function createFakeClient(options?: { withTransaction?: boolean; withQueryRaw?: boolean }) {
  const tables = new Map<string, Row[]>();
  const log: string[] = [];
  const held = new Map<string, Promise<void>>();
  let txCounter = 0;

  const table = (name: string): Row[] => {
    let rows = tables.get(name);
    if (!rows) {
      rows = [];
      tables.set(name, rows);
    }
    return rows;
  };

  function client(label: string, undo?: Array<() => void>) {
    const delegate = (model: string) => ({
      async findFirst(args: { where: Record<string, unknown>; include?: unknown }) {
        log.push(`${label}:${model}.findFirst`);
        return table(model).find((row) => matches(row, args.where)) ?? null;
      },
      async findMany(args: { where: Record<string, unknown>; take?: number }) {
        log.push(`${label}:${model}.findMany${args.take ? `:take${args.take}` : ''}`);
        return table(model).filter((row) => matches(row, args.where));
      },
      async create(args: { data: Row }) {
        log.push(`${label}:${model}.create`);
        const row = { ...args.data };
        table(model).push(row);
        undo?.push(() => {
          const rows = table(model);
          rows.splice(rows.indexOf(row), 1);
        });
        return row;
      },
      async createMany(args: { data: Row[] }) {
        log.push(`${label}:${model}.createMany`);
        for (const data of args.data) {
          const row = { ...data };
          table(model).push(row);
          undo?.push(() => {
            const rows = table(model);
            rows.splice(rows.indexOf(row), 1);
          });
        }
      },
      async update(args: { where: Record<string, unknown>; data: Row }) {
        log.push(`${label}:${model}.update:${JSON.stringify(args.where)}`);
        const row = table(model).find((candidate) => matches(candidate, args.where));
        if (!row) throw Object.assign(new Error('Record to update not found'), { code: 'P2025' });
        const before = { ...row };
        Object.assign(row, args.data);
        undo?.push(() => {
          for (const key of Object.keys(row)) delete row[key];
          Object.assign(row, before);
        });
        return row;
      },
      async updateMany(args: { where: Record<string, unknown>; data: Row }) {
        log.push(`${label}:${model}.updateMany`);
        for (const row of table(model).filter((candidate) => matches(candidate, args.where))) {
          const before = { ...row };
          Object.assign(row, args.data);
          undo?.push(() => {
            for (const key of Object.keys(row)) delete row[key];
            Object.assign(row, before);
          });
        }
      },
      async deleteMany(args: { where: Record<string, unknown> }) {
        log.push(`${label}:${model}.deleteMany`);
        const rows = table(model);
        for (const row of rows.filter((candidate) => matches(candidate, args.where))) {
          rows.splice(rows.indexOf(row), 1);
        }
      },
    });
    const models = [
      'osOrder',
      'osOrganizationMember',
      'osRoleAssignment',
      'osDelivery',
      'osDeliveryNote',
      'osDeliveryNoteLine',
      'osDeliveryEvidence',
      'osWarehouseExit',
      'osWarehouseOutboundNote',
      'osWarehouseOutboundNoteLine',
      'osIdempotencyKey',
    ];
    const base: Record<string, unknown> = {};
    for (const model of models) base[model] = delegate(model);
    return base;
  }

  const root: Record<string, unknown> = client('root');

  if (options?.withTransaction !== false) {
    root.$transaction = async (fn: (tx: unknown) => Promise<unknown>) => {
      const id = ++txCounter;
      const undo: Array<() => void> = [];
      const myReleasers: Array<() => void> = [];
      const tx = client(`tx${id}`, undo);
      if (options?.withQueryRaw !== false) {
        tx.$queryRaw = async (strings: TemplateStringsArray, ...values: unknown[]) => {
          const sql = strings.join('?');
          log.push(`tx${id}:$queryRaw:${sql.replace(/\s+/g, ' ').trim()}|${values.join(',')}`);
          if (/FOR UPDATE/i.test(sql)) {
            const key = String(values.join(':'));
            while (held.has(key)) await held.get(key);
            let release!: () => void;
            held.set(
              key,
              new Promise<void>((resolve) => {
                release = resolve;
              }),
            );
            myReleasers.push(() => {
              held.delete(key);
              release();
            });
          }
          return [];
        };
      }
      log.push(`tx${id}:begin`);
      try {
        const result = await fn(tx);
        log.push(`tx${id}:commit`);
        return result;
      } catch (err) {
        for (const step of undo.reverse()) step();
        log.push(`tx${id}:rollback`);
        throw err;
      } finally {
        for (const releaseLock of myReleasers) releaseLock();
      }
    };
  }
  return { client: root, tables, log, table };
}

function seed(fake: ReturnType<typeof createFakeClient>, lineQuantity = 12) {
  fake.table('osOrder').push({
    id: 'order-1',
    organizationId: 'org-a',
    partyId: 'party-a',
    orderNumber: 'PED-1',
    status: 'open',
    lines: [
      {
        id: 'line-1',
        descriptionSnapshot: 'Mermelada 500g',
        quantity: lineQuantity,
        unitLabel: 'unidades',
        productRefSnapshot: 'jar-500',
      },
    ],
  });
  fake.table('osOrganizationMember').push({ id: 'member-a', organizationId: 'org-a', accessStatus: 'active' });
  for (const roleKey of [WAREHOUSE_EXIT_RECORD_SCOPE, CUSTOMER_DELIVERY_RECORD_SCOPE]) {
    fake.table('osRoleAssignment').push({
      organizationId: 'org-a',
      memberId: 'member-a',
      roleKey,
      effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
      endedAt: null,
    });
  }
}

function harness(lineQuantity = 12, options?: Parameters<typeof createFakeClient>[0]) {
  const fake = createFakeClient(options);
  seed(fake, lineQuantity);
  const store = createPrismaDeliveryStore(fake.client as unknown as DeliveryPrismaPort);
  return { fake, store, svc: new DeliveryCommandService(store) };
}

const ctx = () => ({ organizationId: 'org-a', actorMemberId: 'member-a', effectiveAt: NOW });
const q = (quantity: number) => [{ orderLineId: 'line-1', quantity }];
const nota = (quantity: number) => ({
  orderId: 'order-1',
  recipient: 'Recepción',
  deliveredBy: 'Ana',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(quantity),
});
const salida = (quantity: number, deliveryNoteId?: string) => ({
  orderId: 'order-1',
  exitedAt: '2026-09-14T13:00:00.000Z',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
  quantities: q(quantity),
  ...(deliveryNoteId ? { deliveryNoteId } : {}),
});
const correction = (deliveryNoteId: string) => ({
  deliveryNoteId,
  reason: 'Error de captura',
  recordedBy: 'member-a',
  source: 'employee_recorded' as const,
});

describe('prisma delivery store — transaction port', () => {
  it('runs the callback on the transaction client, not the root client', async () => {
    const { fake, store } = harness();
    await store.runInTransaction(async (tx) => {
      await tx.getMemberInOrg('org-a', 'member-a');
    });
    assert.ok(fake.log.some((entry) => entry.startsWith('tx1:osOrganizationMember.findFirst')));
    assert.equal(
      fake.log.some((entry) => entry.startsWith('root:osOrganizationMember')),
      false,
    );
    assert.deepEqual(
      fake.log.filter((entry) => /^tx\d+:(begin|commit|rollback)$/.test(entry)),
      ['tx1:begin', 'tx1:commit'],
    );
  });

  it('does not open a second transaction for a nested call', async () => {
    const { fake, store } = harness();
    await store.runInTransaction(async (tx) => {
      await tx.runInTransaction(async (inner) => {
        await inner.getMemberInOrg('org-a', 'member-a');
      });
    });
    assert.equal(fake.log.filter((entry) => /begin$/.test(entry)).length, 1);
  });

  it('rolls back and rethrows when the callback throws', async () => {
    const { fake, store } = harness();
    await assert.rejects(
      () =>
        store.runInTransaction(async (tx) => {
          await tx.insertDelivery({
            id: 'd-1',
            organizationId: 'org-a',
            orderId: 'order-1',
            deliveryNoteId: null,
            deliveredAt: NOW.toISOString(),
            deliveredTo: null,
            recordedByMemberId: 'member-a',
            source: 'employee_recorded',
            notes: null,
            createdAt: NOW.toISOString(),
          });
          throw new Error('BOOM');
        }),
      /BOOM/,
    );
    assert.equal(fake.table('osDelivery').length, 0);
    assert.ok(fake.log.includes('tx1:rollback'));
  });

  it('fails closed instead of silently running without a transaction', async () => {
    const { store } = harness(12, { withTransaction: false });
    await assert.rejects(
      () => store.runInTransaction(async () => undefined),
      (err: Error) => err.message === 'TRANSACTION_UNAVAILABLE',
    );
  });

  it('takes the order row lock through the transaction client with FOR UPDATE on os_orders', async () => {
    const { fake, store } = harness();
    await store.runInTransaction((tx) => tx.lockOrderForUpdate('org-a', 'order-1'));
    const raw = fake.log.find((entry) => entry.includes('$queryRaw'));
    assert.ok(raw, 'expected a raw lock statement');
    assert.match(raw, /^tx1:/);
    assert.match(raw, /FROM os_orders/i);
    assert.match(raw, /FOR UPDATE/i);
    assert.match(raw, /\|order-1,org-a$|\|org-a,order-1$/);
  });

  it('refuses to take the lock outside a transaction', async () => {
    const { store } = harness();
    await assert.rejects(
      () => store.lockOrderForUpdate('org-a', 'order-1'),
      (err: Error) => err.message === 'TRANSACTION_REQUIRED',
    );
  });
});

describe('prisma delivery store — guarded reversal', () => {
  it('reverses an issued note exactly once and reports the loser', async () => {
    const { fake, store, svc } = harness();
    const created = await svc.createNotaDeEntrega(ctx(), nota(3));
    assert.equal(await store.reverseIssuedDeliveryNote('org-a', created.deliveryNoteId, 'Error'), true);
    assert.equal(await store.reverseIssuedDeliveryNote('org-a', created.deliveryNoteId, 'Error'), false);
    assert.ok(
      fake.log.some((entry) => entry.includes('osDeliveryNote.update') && entry.includes('"status":"issued"')),
      'update must be guarded on status issued',
    );
    assert.equal(fake.table('osDeliveryNote')[0]?.status, 'reversed');
  });
});

describe('prisma delivery store — dispatch ledger rows', () => {
  it('returns unbounded, tenant-scoped rows including reversed notes and linked exits', async () => {
    const { fake, store, svc } = harness();
    const created = await svc.createNotaDeEntrega(ctx(), nota(4));
    await svc.recordSalida(ctx(), salida(4, created.deliveryNoteId));
    fake.log.length = 0;
    const rows = await store.listDispatchLedgerRows('org-a', 'order-1');
    assert.deepEqual(rows.notes, [{ id: created.deliveryNoteId, status: 'issued' }]);
    assert.deepEqual(rows.noteLines, [{ noteId: created.deliveryNoteId, orderLineId: 'line-1', quantity: 4 }]);
    assert.equal(rows.exits.length, 1);
    assert.equal(rows.exits[0]?.deliveryNoteId, created.deliveryNoteId);
    assert.deepEqual(rows.outboundLines.map((line) => line.quantity), [4]);
    assert.equal(
      fake.log.some((entry) => /:take\d+/.test(entry)),
      false,
      'the ledger read must not use the list limit',
    );
    assert.deepEqual(await store.listDispatchLedgerRows('org-b', 'order-1'), {
      notes: [],
      noteLines: [],
      exits: [],
      outboundLines: [],
    });
  });
});

describe('ADR 0003 over the prisma store — cumulative dispatch is atomic', () => {
  it('takes the order lock before reading the order inside the same transaction', async () => {
    const { fake, svc } = harness();
    await svc.createNotaDeEntrega(ctx(), nota(3));
    const inTx = fake.log.filter((entry) => entry.startsWith('tx1:'));
    const lockAt = inTx.findIndex((entry) => entry.includes('FOR UPDATE'));
    const orderReadAt = inTx.findIndex((entry) => entry.includes('osOrder.findFirst'));
    const firstWriteAt = inTx.findIndex((entry) => /osDeliveryNote\.create$/.test(entry));
    assert.ok(lockAt >= 0, 'expected the lock inside the transaction');
    assert.ok(lockAt < orderReadAt, 'lock must precede the fresh order read');
    assert.ok(orderReadAt < firstWriteAt);
    assert.equal(inTx.at(-1), 'tx1:commit');
  });

  it('rejects the excess dispatch and still allows the partial one', async () => {
    const { svc, fake } = harness();
    await svc.createNotaDeEntrega(ctx(), nota(5));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(8)), /VALIDATION_FAILED/);
    await svc.createNotaDeEntrega(ctx(), nota(7));
    assert.equal(fake.table('osDeliveryNote').length, 2);
  });

  it('lets exactly one of two concurrent notes through', async () => {
    const { svc, fake } = harness();
    const results = await Promise.allSettled([
      svc.createNotaDeEntrega(ctx(), nota(8)),
      svc.createNotaDeEntrega(ctx(), nota(8)),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(fake.table('osDeliveryNote').length, 1);
  });

  it('lets exactly one of two concurrent salidas through', async () => {
    const { svc, fake } = harness();
    const results = await Promise.allSettled([svc.recordSalida(ctx(), salida(8)), svc.recordSalida(ctx(), salida(8))]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(fake.table('osWarehouseExit').length, 1);
  });

  it('does not double count a linked salida, and a reversal restores the quantity', async () => {
    const { svc, fake } = harness();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    await svc.recordSalida(ctx(), salida(12, created.deliveryNoteId));
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(1)), /VALIDATION_FAILED/);
    await svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId));
    await svc.createNotaDeEntrega(ctx(), nota(12));
    assert.equal(fake.table('osDeliveryNote').filter((row) => row.status === 'issued').length, 1);
  });
});

describe('D3 over the prisma store — all-or-nothing and single-winner', () => {
  it('rolls the whole command back when a later write fails', async () => {
    const { svc, fake } = harness();
    const original = (fake.client.osDeliveryNoteLine as { createMany?: unknown }).createMany;
    assert.ok(original);
    // Fail the lines insert on the transaction client only.
    const realTx = fake.client.$transaction as (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
    fake.client.$transaction = (fn: (tx: unknown) => Promise<unknown>) =>
      realTx(async (tx) => {
        (tx as { osDeliveryNoteLine: { createMany: () => Promise<never> } }).osDeliveryNoteLine.createMany =
          async () => {
            throw new Error('INJECTED_FAILURE');
          };
        return fn(tx);
      });
    await assert.rejects(() => svc.createNotaDeEntrega(ctx(), nota(3)), /INJECTED_FAILURE/);
    assert.equal(fake.table('osDeliveryNote').length, 0);
  });

  it('lets exactly one of two concurrent corrections win', async () => {
    const { svc, fake } = harness();
    const created = await svc.createNotaDeEntrega(ctx(), nota(12));
    const results = await Promise.allSettled([
      svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId)),
      svc.correctDeliveryDocument(ctx(), correction(created.deliveryNoteId)),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      fake.table('osDeliveryNote').filter((row) => row.correctsNoteId === created.deliveryNoteId).length,
      1,
    );
  });

  it('Pedido timeline still derives from persisted rows on the hosted store (fallback intact)', async () => {
    const { svc } = harness();
    const created = await svc.createNotaDeEntrega(ctx(), nota(3));
    await svc.recordSalida(ctx(), salida(3, created.deliveryNoteId));
    const timeline = await svc.listTimelineForOrder(ctx(), 'order-1');
    // salida exitedAt 13:00Z precedes the nota bornAt (effectiveAt 15:00Z).
    assert.deepEqual(
      timeline.map((item) => item.eventType),
      ['warehouse_exit.recorded', 'delivery_note.created'],
    );
    assert.ok(timeline.every((item) => item.id.startsWith('derived:')));
  });
});
