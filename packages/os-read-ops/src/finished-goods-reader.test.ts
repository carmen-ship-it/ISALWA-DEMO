import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FinishedGoodsReceiptRow, OperatingReadDb } from './db-port';
import { readFinishedGoodsReceipts } from './finished-goods-reader';

const ORG = 'org-a';

function session(scopes: string[] = ['management.org.read']) {
  return { organizationId: ORG, grantedScopes: scopes, accessStatus: 'active' as const };
}

function receipt(overrides: Partial<FinishedGoodsReceiptRow> = {}): FinishedGoodsReceiptRow {
  return {
    id: 'fgr-1',
    organizationId: ORG,
    productId: 'prod-1',
    quantity: '4',
    warehouseLabel: 'Almacén de Productos Terminados',
    receivedAt: '2026-09-14T15:00:00.000Z',
    recordedAt: '2026-09-14T15:01:00.000Z',
    actorMemberId: 'mem-a',
    actorLabel: 'Almacén',
    source: 'explicit_command',
    productionTraceEntryId: null,
    quemaId: null,
    correctsReceiptId: null,
    correctionReason: null,
    ...overrides,
  };
}

function db(rows: FinishedGoodsReceiptRow[]): OperatingReadDb {
  return {
    async listFinishedGoodsReceipts(query) {
      return rows.filter((row) => row.organizationId === query.organizationId);
    },
  } as OperatingReadDb;
}

describe('readFinishedGoodsReceipts', () => {
  it('stays UNPROVEN when the port is absent and does not report zero stock', async () => {
    const result = await readFinishedGoodsReceipts({
      session: session(),
      db: {} as OperatingReadDb,
    });
    assert.equal(result.state, 'UNPROVEN');
    assert.equal(result.factCount, null);
    assert.equal(result.stockQuantity, null);
    assert.equal(result.representAsZeroStock, false);
  });

  it('returns NO_FACT for an authorized empty query and drops a foreign row', async () => {
    const empty = await readFinishedGoodsReceipts({ session: session(), db: db([]) });
    assert.equal(empty.state, 'NO_FACT');
    assert.equal(empty.factCount, 0);
    assert.equal(empty.stockQuantity, null);

    const foreign = await readFinishedGoodsReceipts({
      session: session(),
      db: db([receipt({ id: 'fgr-foreign', organizationId: 'org-b', quantity: '9' })]),
    });
    assert.equal(foreign.state, 'NO_FACT');
    assert.equal(JSON.stringify(foreign).includes('9'), false);
  });

  it('returns a receipt without treating it as allocation or stock, and receive is not the read gate', async () => {
    const result = await readFinishedGoodsReceipts({
      session: session(),
      db: db([receipt(), receipt({ id: 'fgr-foreign', organizationId: 'org-b' })]),
    });
    assert.equal(result.state, 'AVAILABLE');
    if (result.state !== 'AVAILABLE') return;
    assert.equal(result.facts.length, 1);
    assert.equal(result.facts[0]?.allocatesToOrder, false);
    assert.equal(result.facts[0]?.officialStock, false);
    assert.equal(result.facts[0]?.listoMeansAllocated, false);

    const receiveOnly = await readFinishedGoodsReceipts({
      session: session(['warehouse.finished_goods.receive']),
      db: db([receipt()]),
    });
    assert.equal(receiveOnly.state, 'UNPROVEN');
    assert.equal(receiveOnly.factCount, null);
  });
});
