import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommerceController } from './commerce.controller';
import {
  CommerceService,
  QUOTE_MUTATION_AUTHORITY,
  type CommerceLookupDb,
  type TrustedCommerceSession,
} from './commerce.service';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COUNT = 7;
const READ = 'commercial.team.read';
const PRODUCT_ADMIN = 'master_data.admin';
const CONVERT = 'commercial.quote.convert.own';
const FINANCE = 'finance.operational.record';
const QUOTE_MISSING = 'Cotización no encontrada';
const INVOICE_MISSING = 'Factura no encontrada';
const PRICE_MISSING = 'Producto no encontrado';
const FOREIGN_PRICE = 777777n;
const FOREIGN_DATE = new Date('1999-09-09T09:09:09.000Z');
const NEWER_FOREIGN_DATE = new Date('2099-01-01T00:00:00.000Z');
const SESSION_OBSERVED = new Date('2026-03-01T00:00:00.000Z');

type Call = { model: string; op: string; where?: unknown; data?: unknown };

type AccountRow = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  tradeName: string | null;
  legalName: string;
};

type ProductRow = {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  listPriceCentavos: bigint;
};

type ObservationRow = {
  id: string;
  organizationId: string;
  accountId: string;
  productId: string;
  unitPriceCentavos: bigint;
  observedAt: Date;
  source: string | null;
};

function session(scopes: readonly string[]): TrustedCommerceSession {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function matchesWhere(row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true;
  for (const [key, expected] of Object.entries(where)) {
    if (expected && typeof expected === 'object' && 'in' in expected) {
      const ids = (expected as { in: unknown[] }).in;
      if (!ids.includes(row[key])) return false;
      continue;
    }
    if (row[key] !== expected) return false;
  }
  return true;
}

function quoteRow(id: string, organizationId: string, name: string, number: string, total: bigint) {
  return {
    id,
    organizationId,
    number,
    status: 'draft',
    accountId: organizationId === SESSION ? 'acct-alpha' : 'acct-zeta',
    notes: null,
    validUntil: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    sentAt: null,
    acceptedAt: null,
    subtotalCentavos: total,
    taxCentavos: 0n,
    totalCentavos: total,
    account: { tradeName: name, legalName: name, code: organizationId === SESSION ? 'ALP' : 'ZET' },
    owner: { name },
    items: [
      {
        id: `${id}-line`,
        productId: organizationId === SESSION ? 'prod-alpha' : 'prod-zeta',
        description: name,
        qty: 1,
        unitPriceCentavos: total,
        lineTotalCentavos: total,
        lastPriceShownCentavos: null,
        product: { sku: organizationId === SESSION ? 'ALP-1' : 'ZET-9', name },
      },
    ],
    orders: [],
  };
}

function invoiceRow(id: string, organizationId: string, name: string, number: string, balance: bigint) {
  return {
    id,
    organizationId,
    number,
    status: 'open',
    accountId: organizationId === SESSION ? 'acct-alpha' : 'acct-zeta',
    issuedAt: new Date('2026-03-02T00:00:00.000Z'),
    dueAt: new Date('2026-04-02T00:00:00.000Z'),
    totalCentavos: balance,
    balanceCentavos: balance,
    orderId: null,
    account: { tradeName: name, legalName: name },
    order: null,
    items: [
      {
        id: `${id}-line`,
        qty: 1,
        unitPriceCentavos: balance,
        lineTotalCentavos: balance,
        product: { name, sku: organizationId === SESSION ? 'ALP-1' : 'ZET-9' },
      },
    ],
    allocations: [],
  };
}

function fixture(extra?: {
  observations?: ObservationRow[];
  products?: ProductRow[];
}) {
  const accounts: AccountRow[] = [
    { id: 'acct-alpha', organizationId: SESSION, ownerUserId: 'owner-alpha', tradeName: SESSION_NAME, legalName: SESSION_NAME },
    { id: 'acct-zeta', organizationId: OTHER, ownerUserId: 'owner-zeta', tradeName: OTHER_NAME, legalName: OTHER_NAME },
  ];
  const products = extra?.products ?? [
    { id: 'prod-alpha', organizationId: SESSION, sku: 'ALP-1', name: SESSION_NAME, listPriceCentavos: 1000n },
    { id: 'prod-zeta', organizationId: OTHER, sku: 'ZET-9', name: OTHER_NAME, listPriceCentavos: 8888n },
  ];
  const observations = extra?.observations ?? [
    {
      id: 'obs-alpha',
      organizationId: SESSION,
      accountId: 'acct-alpha',
      productId: 'prod-alpha',
      unitPriceCentavos: 1500n,
      observedAt: SESSION_OBSERVED,
      source: 'quote',
    },
    {
      id: 'obs-foreign-newer',
      organizationId: OTHER,
      accountId: 'acct-alpha',
      productId: 'prod-alpha',
      unitPriceCentavos: FOREIGN_PRICE,
      observedAt: NEWER_FOREIGN_DATE,
      source: 'other-tenant',
    },
    {
      id: 'obs-zeta',
      organizationId: OTHER,
      accountId: 'acct-zeta',
      productId: 'prod-zeta',
      unitPriceCentavos: 666666n,
      observedAt: FOREIGN_DATE,
      source: 'other-tenant',
    },
    ...Array.from({ length: OTHER_COUNT }, (_, index) => ({
      id: `obs-zeta-${index}`,
      organizationId: OTHER,
      accountId: 'acct-zeta',
      productId: 'prod-zeta',
      unitPriceCentavos: FOREIGN_PRICE,
      observedAt: FOREIGN_DATE,
      source: 'other-tenant',
    })),
  ];
  const quotes = [
    quoteRow('quote-alpha', SESSION, SESSION_NAME, 'COT-00001', 1000n),
    quoteRow('quote-zeta', OTHER, OTHER_NAME, 'COT-99999', FOREIGN_PRICE),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      quoteRow(`quote-zeta-${index}`, OTHER, OTHER_NAME, 'COT-99999', FOREIGN_PRICE),
    ),
  ];
  const invoices = [
    invoiceRow('inv-alpha', SESSION, SESSION_NAME, 'FAC-00001', 5000n),
    invoiceRow('inv-zeta', OTHER, OTHER_NAME, 'FAC-99999', 888888n),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      invoiceRow(`inv-zeta-${index}`, OTHER, OTHER_NAME, 'FAC-99999', 888888n),
    ),
  ];
  const calls: Call[] = [];
  const stores = { accounts, products, observations, quotes, invoices };

  function record(model: string, op: string, args?: { where?: unknown; data?: unknown }) {
    calls.push({ model, op, where: args?.where, data: args?.data });
  }

  function first<T extends Record<string, unknown>>(rows: T[], where: unknown, orderBy?: unknown): T | null {
    const matched = rows.filter((row) => matchesWhere(row, where as Record<string, unknown>));
    if (orderBy && typeof orderBy === 'object' && orderBy && 'observedAt' in orderBy) {
      matched.sort((left, right) => {
        const l = left.observedAt instanceof Date ? left.observedAt.getTime() : 0;
        const r = right.observedAt instanceof Date ? right.observedAt.getTime() : 0;
        return r - l;
      });
    }
    return matched[0] ?? null;
  }

  const db = {
    account: {
      async findFirst(args: { where: Record<string, unknown> }) {
        record('account', 'findFirst', args);
        return first(accounts, args.where);
      },
    },
    product: {
      async findFirst(args: { where: Record<string, unknown> }) {
        record('product', 'findFirst', args);
        return first(products, args.where);
      },
      async findMany(args: { where: Record<string, unknown> }) {
        record('product', 'findMany', args);
        return products.filter((row) => matchesWhere(row, args.where));
      },
    },
    priceObservation: {
      async findFirst(args: { where: Record<string, unknown>; orderBy?: unknown }) {
        record('priceObservation', 'findFirst', args);
        return first(observations, args.where, args.orderBy);
      },
      async create(args: { data: unknown }) {
        record('priceObservation', 'create', args);
        return args.data;
      },
    },
    quote: {
      async findFirst(args: { where: Record<string, unknown> }) {
        record('quote', 'findFirst', args);
        return first(quotes, args.where);
      },
      async count(args: { where: Record<string, unknown> }) {
        record('quote', 'count', args);
        return quotes.filter((row) => matchesWhere(row, args.where)).length;
      },
      async create(args: { data: unknown }) {
        record('quote', 'create', args);
        return args.data;
      },
      async update(args: { where: unknown; data: unknown }) {
        record('quote', 'update', args);
        return args.data;
      },
    },
    invoice: {
      async findFirst(args: { where: Record<string, unknown> }) {
        record('invoice', 'findFirst', args);
        return first(invoices, args.where);
      },
      async count(args: { where: Record<string, unknown> }) {
        record('invoice', 'count', args);
        return invoices.filter((row) => matchesWhere(row, args.where)).length;
      },
      async create(args: { data: unknown }) {
        record('invoice', 'create', args);
        return args.data;
      },
      async update(args: { where: { id?: string }; data: { balanceCentavos?: bigint; status?: string } }) {
        record('invoice', 'update', args);
        const row = invoices.find((item) => item.id === args.where.id);
        if (row && args.data.balanceCentavos !== undefined) row.balanceCentavos = args.data.balanceCentavos;
        if (row && args.data.status) row.status = args.data.status;
        return row ?? null;
      },
    },
    order: {
      async count(args: { where: unknown }) {
        record('order', 'count', args);
        return 0;
      },
      async create(args: { data: unknown }) {
        record('order', 'create', args);
        return args.data;
      },
    },
    payment: {
      async create(args: { data: unknown }) {
        record('payment', 'create', args);
        return args.data;
      },
    },
    activityEvent: {
      async create(args: { data: unknown }) {
        record('activityEvent', 'create', args);
        return args.data;
      },
    },
    async $transaction<T>(fn: (tx: CommerceLookupDb) => Promise<T>) {
      record('$transaction', 'run');
      return fn(db as unknown as CommerceLookupDb);
    },
  };
  return { db: db as unknown as CommerceLookupDb, calls, stores };
}

function service() {
  return new CommerceService({ pdf: { renderQuotePdf: async () => new Uint8Array() } } as never);
}

function evidence(value: unknown): string {
  if (value instanceof Error) {
    const response = 'getResponse' in value ? (value as { getResponse: () => unknown }).getResponse() : undefined;
    return `${value.name} ${value.message} ${JSON.stringify(response ?? {})}`;
  }
  return JSON.stringify(value);
}

function assertNoLeak(value: unknown): void {
  const serialized = evidence(value);
  for (const marker of [OTHER, OTHER_NAME, 'COT-99999', 'FAC-99999', '777777', '666666', '888888', '1999-09-09', '2099-01-01', 'ZET-9', 'acct-zeta', 'prod-zeta', 'quote-zeta', 'other-tenant']) {
    assert.equal(serialized.includes(marker), false, marker);
  }
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

function dump(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item));
}

function assertScoped(calls: Call[]): void {
  assert.equal(dump(calls).includes(OTHER), false);
  for (const call of calls) {
    if (!call.where || typeof call.where !== 'object') continue;
    const where = call.where as { organizationId?: string };
    if ('organizationId' in where) assert.equal(where.organizationId, SESSION);
  }
}

function creates(calls: Call[], model: string): Call[] {
  return calls.filter((call) => call.model === model && call.op === 'create');
}

async function assertDenied(run: () => Promise<unknown>, code: 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN'): Promise<void> {
  await assert.rejects(run, (err: unknown) => {
    assert.equal(err instanceof Error ? err.message : '', code);
    if (code === 'AUTH_REQUIRED') assert.ok(err instanceof UnauthorizedException);
    if (code === 'ROLE_FORBIDDEN') assert.ok(err instanceof ForbiddenException);
    assertNoLeak(err);
    return true;
  });
}

async function assertMissing(run: () => Promise<unknown>, message: string): Promise<unknown> {
  let caught: unknown;
  await assert.rejects(run, (err: unknown) => {
    caught = err;
    assert.ok(err instanceof NotFoundException);
    assert.equal(err.message, message);
    assertNoLeak(err);
    return true;
  });
  return caught;
}

describe('CommerceService tenant lookups', () => {
  it('lastPrice same-tenant read returns the session price and scopes every where', async () => {
    const { db, calls } = fixture();
    const result = await service().lastPrice('acct-alpha', 'prod-alpha', session([READ]), db);
    assert.equal(result.sku, 'ALP-1');
    assert.equal(result.name, SESSION_NAME);
    assert.equal(result.lastPrice?.centavos, 1500);
    assert.equal(result.lastObservedAt?.toISOString(), SESSION_OBSERVED.toISOString());
    assert.deepEqual(calls.find((call) => call.model === 'account' && call.op === 'findFirst')?.where, {
      id: 'acct-alpha',
      organizationId: SESSION,
    });
    const observation = calls.find((call) => call.model === 'priceObservation');
    assert.deepEqual(observation?.where, { accountId: 'acct-alpha', productId: 'prod-alpha', organizationId: SESSION });
    assert.deepEqual(calls.find((call) => call.model === 'product' && call.op === 'findFirst')?.where, { id: 'prod-alpha', organizationId: SESSION });
    assert.equal(calls.some((call) => call.op === 'findUnique'), false);
    assertScoped(calls);
    assertNoLeak(result);
  });

  it('lastPrice foreign observation has the same empty shape as a missing observation', async () => {
    const shared = [
      {
        id: 'obs-foreign-only',
        organizationId: OTHER,
        accountId: 'acct-alpha',
        productId: 'prod-alpha',
        unitPriceCentavos: FOREIGN_PRICE,
        observedAt: FOREIGN_DATE,
        source: 'other-tenant',
      },
    ];
    const foreign = fixture({ observations: shared });
    const missing = fixture({ observations: [] });
    const foreignResult = await service().lastPrice('acct-alpha', 'prod-alpha', session([READ]), foreign.db);
    const missingResult = await service().lastPrice('acct-alpha', 'prod-alpha', session([READ]), missing.db);
    assert.equal(foreignResult.lastPrice, null);
    assert.equal(foreignResult.lastObservedAt, null);
    assert.equal(foreignResult.source, null);
    assert.deepEqual(
      { lastPrice: foreignResult.lastPrice, lastObservedAt: foreignResult.lastObservedAt, source: foreignResult.source },
      { lastPrice: missingResult.lastPrice, lastObservedAt: missingResult.lastObservedAt, source: missingResult.source },
    );
    assert.equal(foreignResult.suggestedUnitPriceCentavos, missingResult.suggestedUnitPriceCentavos);
    assert.deepEqual(foreign.calls.find((call) => call.model === 'priceObservation')?.where, {
      accountId: 'acct-alpha',
      productId: 'prod-alpha',
      organizationId: SESSION,
    });
    assertScoped(foreign.calls);
    assertNoLeak(foreignResult);
  });

  it('lastPrice foreign account matches missing account and does not load a price memory', async () => {
    const { db, calls } = fixture();
    const foreign = await assertMissing(
      () => service().lastPrice('acct-zeta', 'prod-alpha', session([READ]), db),
      PRICE_MISSING,
    );
    const missingDb = fixture();
    const missing = await assertMissing(
      () => service().lastPrice('acct-missing', 'prod-alpha', session([READ]), missingDb.db),
      PRICE_MISSING,
    );
    assert.equal((foreign as Error).message, (missing as Error).message);
    assert.equal(calls.filter((call) => call.model === 'priceObservation').length, 0);
    assert.equal(calls.filter((call) => call.model === 'product').length, 0);
    assert.deepEqual(calls.find((call) => call.model === 'account')?.where, { id: 'acct-zeta', organizationId: SESSION });
    assertScoped(calls);
    assertNoLeak(foreign);
  });

  it('lastPrice does not reveal a product bought by another tenant', async () => {
    const { db, calls } = fixture({
      observations: [
        {
          id: 'obs-pointer',
          organizationId: SESSION,
          accountId: 'acct-alpha',
          productId: 'prod-zeta',
          unitPriceCentavos: 555555n,
          observedAt: new Date('1988-08-08T00:00:00.000Z'),
          source: 'other-tenant',
        },
      ],
    });
    await assertMissing(() => service().lastPrice('acct-alpha', 'prod-zeta', session([READ]), db), PRICE_MISSING);
    assert.deepEqual(calls.find((call) => call.model === 'product')?.where, { id: 'prod-zeta', organizationId: SESSION });
    assert.equal(calls.some((call) => call.op === 'findUnique'), false);
    assert.equal(JSON.stringify(calls).includes('555555'), false);
    assertScoped(calls);
  });

  it('lastPrice wrong capability does not query', async () => {
    const { db, calls } = fixture();
    await assertDenied(() => service().lastPrice('acct-zeta', 'prod-zeta', session([PRODUCT_ADMIN, FINANCE]), db), 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
  });

  it('lastPrice missing session is AUTH_REQUIRED and does not query', async () => {
    const { db, calls } = fixture();
    await assertDenied(() => service().lastPrice('acct-zeta', 'prod-zeta', null, db), 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
  });

  it('lastPrice where is scoped and other-tenant observation count does not leak', async () => {
    const { db, calls } = fixture();
    const result = await service().lastPrice('acct-alpha', 'prod-alpha', session([READ]), db);
    assert.equal(result.lastPrice?.centavos, 1500);
    assert.notEqual(result.lastPrice?.centavos, Number(FOREIGN_PRICE));
    assert.equal(calls.filter((call) => call.model === 'priceObservation' && call.op === 'count').length, 0);
    assertScoped(calls);
    assertNoLeak(result);
    assert.equal(JSON.stringify(result).includes(String(OTHER_COUNT)), false);
  });

  it('getQuote same-tenant read uses findFirst id and organizationId', async () => {
    const { db, calls } = fixture();
    const result = await service().getQuote('quote-alpha', session([READ]), db);
    assert.equal(result.number, 'COT-00001');
    assert.equal(result.total.centavos, 1000);
    assert.equal(result.items.length, 1);
    assert.equal(calls.filter((call) => call.op === 'findUnique').length, 0);
    assert.equal(calls.filter((call) => call.model === 'quote' && call.op === 'count').length, 0);
    assert.deepEqual(calls[0]?.where, { id: 'quote-alpha', organizationId: SESSION });
    assertScoped(calls);
    assertNoLeak(result);
  });

  it('getQuote wrong capability does not query', async () => {
    const { db, calls } = fixture();
    await assertDenied(() => service().getQuote('quote-zeta', session([PRODUCT_ADMIN, FINANCE, CONVERT]), db), 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
  });

  it('getQuote foreign and missing ids share one not-found and leak nothing', async () => {
    const foreignDb = fixture();
    const missingDb = fixture();
    const foreign = await assertMissing(() => service().getQuote('quote-zeta', session([READ]), foreignDb.db), QUOTE_MISSING);
    const missing = await assertMissing(() => service().getQuote('quote-missing', session([READ]), missingDb.db), QUOTE_MISSING);
    assert.equal((foreign as Error).message, (missing as Error).message);
    assert.equal(evidence(foreign).includes('COT-99999'), false);
    assert.equal(evidence(foreign).includes('777777'), false);
    assert.deepEqual(foreignDb.calls[0]?.where, { id: 'quote-zeta', organizationId: SESSION });
    assert.equal(foreignDb.calls[0]?.op, 'findFirst');
    assertScoped(foreignDb.calls);
  });

  it('getQuote missing session does not query', async () => {
    const { db, calls } = fixture();
    await assertDenied(() => service().getQuote('quote-zeta', undefined, db), 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
  });

  it('getInvoice same-tenant operational reference read does not imply finance record', async () => {
    const { db, calls } = fixture();
    const result = await service().getInvoice('inv-alpha', session([READ]), db);
    assert.equal(result.number, 'FAC-00001');
    assert.equal(result.balance.centavos, 5000);
    assert.equal(result.accountName, SESSION_NAME);
    assert.deepEqual(calls[0]?.where, { id: 'inv-alpha', organizationId: SESSION });
    assert.equal(calls[0]?.op, 'findFirst');
    assertScoped(calls);
    assertNoLeak(result);
    const denied = fixture();
    await assertDenied(() => service().getInvoice('inv-alpha', session([FINANCE]), denied.db), 'ROLE_FORBIDDEN');
    assert.equal(denied.calls.length, 0);
  });

  it('getInvoice wrong capability does not query', async () => {
    const { db, calls } = fixture();
    await assertDenied(() => service().getInvoice('inv-zeta', session([PRODUCT_ADMIN]), db), 'ROLE_FORBIDDEN');
    assert.equal(calls.length, 0);
  });

  it('getInvoice foreign and missing ids share one not-found and leak nothing', async () => {
    const foreignDb = fixture();
    const missingDb = fixture();
    const foreign = await assertMissing(() => service().getInvoice('inv-zeta', session([READ]), foreignDb.db), INVOICE_MISSING);
    const missing = await assertMissing(() => service().getInvoice('inv-missing', session([READ]), missingDb.db), INVOICE_MISSING);
    assert.equal((foreign as Error).message, (missing as Error).message);
    assert.equal(evidence(foreign).includes('FAC-99999'), false);
    assert.equal(evidence(foreign).includes(OTHER_NAME), false);
    assert.equal(evidence(foreign).includes('888888'), false);
    assert.deepEqual(foreignDb.calls[0]?.where, { id: 'inv-zeta', organizationId: SESSION });
    assertScoped(foreignDb.calls);
  });

  it('getInvoice missing session does not query', async () => {
    const { db, calls } = fixture();
    await assertDenied(() => service().getInvoice('inv-zeta', null, db), 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
  });

  it('getInvoice where is scoped and other-tenant invoice count does not leak', async () => {
    const { db, calls } = fixture();
    const result = await service().getInvoice('inv-alpha', session([READ]), db);
    assert.equal(calls.filter((call) => call.op === 'count').length, 0);
    assert.equal(calls[0]?.op, 'findFirst');
    assertScoped(calls);
    assertNoLeak(result);
    assert.notEqual(JSON.stringify(result).includes(String(OTHER_COUNT)), true);
  });

  it('createQuote same-tenant commercial.team.read is CROSS_LANE and does not insert', async () => {
    const { db, calls } = fixture();
    await assertDenied(
      () => service().createQuote({ accountId: 'acct-alpha', items: [{ productId: 'prod-alpha', qty: 1 }] }, session([READ]), db),
      'ROLE_FORBIDDEN',
    );
    assert.equal(QUOTE_MUTATION_AUTHORITY, 'CROSS_LANE_CHANGE_REQUEST');
    assert.equal(creates(calls, 'quote').length, 0);
    assert.equal(calls.filter((call) => call.op === 'count').length, 0);
    assert.equal(calls.length, 0);
  });

  it('createQuote commercial.quote.convert.own does not insert', async () => {
    const { db, calls } = fixture();
    await assertDenied(
      () => service().createQuote({ accountId: 'acct-alpha', items: [{ productId: 'prod-alpha', qty: 1 }] }, session([CONVERT, READ]), db),
      'ROLE_FORBIDDEN',
    );
    assert.equal(creates(calls, 'quote').length, 0);
    assert.equal(calls.length, 0);
  });

  it('createQuote foreign accountId does not call quote.create', async () => {
    const { db, calls } = fixture();
    await assertDenied(
      () => service().createQuote({ accountId: 'acct-zeta', items: [{ productId: 'prod-zeta', qty: 2 }] }, session([READ, CONVERT, FINANCE]), db),
      'ROLE_FORBIDDEN',
    );
    assert.equal(creates(calls, 'quote').length, 0);
    assert.equal(calls.some((call) => call.model === 'quote' && call.op === 'create'), false);
    assert.equal(calls.length, 0);
  });

  it('createQuote missing session does not insert', async () => {
    const { db, calls } = fixture();
    await assertDenied(
      () => service().createQuote({ accountId: 'acct-zeta', items: [{ productId: 'prod-zeta', qty: 1 }] }, undefined, db),
      'AUTH_REQUIRED',
    );
    assert.equal(creates(calls, 'quote').length, 0);
    assert.equal(calls.length, 0);
  });

  it('sendQuote and acceptQuote are CROSS_LANE even for the same tenant', async () => {
    const send = fixture();
    const accept = fixture();
    await assertDenied(() => service().sendQuote('quote-alpha', session([READ, CONVERT]), send.db), 'ROLE_FORBIDDEN');
    await assertDenied(() => service().acceptQuote('quote-alpha', session([CONVERT]), accept.db), 'ROLE_FORBIDDEN');
    assert.equal(send.calls.filter((call) => call.op === 'update' || call.op === 'create').length, 0);
    assert.equal(creates(accept.calls, 'order').length, 0);
    assert.equal(creates(accept.calls, 'invoice').length, 0);
    assert.equal(accept.calls.length, 0);
    assert.equal(QUOTE_MUTATION_AUTHORITY, 'CROSS_LANE_CHANGE_REQUEST');
  });

  it('recordPayment commercial.team.read does not load the invoice or insert a payment', async () => {
    const { db, calls } = fixture();
    await assertDenied(
      () => service().recordPayment({ invoiceId: 'inv-alpha', amountCentavos: 100 }, session([READ]), db),
      'ROLE_FORBIDDEN',
    );
    assert.equal(calls.filter((call) => call.model === 'invoice').length, 0);
    assert.equal(creates(calls, 'payment').length, 0);
    assert.equal(calls.length, 0);
  });

  it('recordPayment foreign invoice is not found and creates no payment', async () => {
    const { db, calls } = fixture();
    const foreign = await assertMissing(
      () => service().recordPayment({ invoiceId: 'inv-zeta', amountCentavos: 100 }, session([FINANCE]), db),
      INVOICE_MISSING,
    );
    const missingDb = fixture();
    const missing = await assertMissing(
      () => service().recordPayment({ invoiceId: 'inv-missing', amountCentavos: 100 }, session([FINANCE]), missingDb.db),
      INVOICE_MISSING,
    );
    assert.equal((foreign as Error).message, (missing as Error).message);
    assert.equal(creates(calls, 'payment').length, 0);
    assert.equal(calls.some((call) => call.op === 'update'), false);
    assert.deepEqual(calls.find((call) => call.model === 'invoice')?.where, { id: 'inv-zeta', organizationId: SESSION });
    assert.equal(calls.find((call) => call.model === 'invoice')?.op, 'findFirst');
    assertScoped(calls);
    assertNoLeak(foreign);
  });

  it('recordPayment missing session does not query or insert', async () => {
    const { db, calls } = fixture();
    await assertDenied(
      () => service().recordPayment({ invoiceId: 'inv-zeta', amountCentavos: 100 }, null, db),
      'AUTH_REQUIRED',
    );
    assert.equal(creates(calls, 'payment').length, 0);
    assert.equal(calls.length, 0);
  });

  it('recordPayment same-tenant finance scope scopes the invoice where before creating a payment', async () => {
    const { db, calls } = fixture();
    const result = await service().recordPayment(
      { invoiceId: 'inv-alpha', amountCentavos: 100 },
      session([FINANCE]),
      db,
    );
    const invoiceLookup = calls.find((call) => call.model === 'invoice' && call.op === 'findFirst');
    const payment = creates(calls, 'payment')[0];
    assert.deepEqual(invoiceLookup?.where, { id: 'inv-alpha', organizationId: SESSION });
    assert.ok(calls.indexOf(invoiceLookup!) < calls.findIndex((call) => call.model === 'payment' && call.op === 'create'));
    assert.equal((payment?.data as { organizationId?: string }).organizationId, SESSION);
    assert.equal(result.accountName, SESSION_NAME);
    assert.equal(calls.filter((call) => call.op === 'count').length, 0);
    assertScoped(calls);
    assertNoLeak(result);
  });
});

describe('CommerceController session binding', () => {
  class LookupCommerce extends CommerceService {
    constructor(private readonly lookup: CommerceLookupDb) {
      super({ pdf: { renderQuotePdf: async () => new Uint8Array() } } as never);
    }

    override lastPrice(accountId: string, productId: string, bound?: TrustedCommerceSession | null) {
      return super.lastPrice(accountId, productId, bound, this.lookup);
    }

    override getQuote(id: string, bound?: TrustedCommerceSession | null) {
      return super.getQuote(id, bound, this.lookup);
    }

    override createQuote(
      input: Parameters<CommerceService['createQuote']>[0],
      bound?: TrustedCommerceSession | null,
    ) {
      return super.createQuote(input, bound, this.lookup);
    }

    override recordPayment(
      input: Parameters<CommerceService['recordPayment']>[0],
      bound?: TrustedCommerceSession | null,
    ) {
      return super.recordPayment(input, bound, this.lookup);
    }
  }

  function request(scopes: readonly string[]) {
    return {
      authenticatedSession: { authenticated: true, organizationId: SESSION, grantedScopes: scopes },
      query: { organizationId: OTHER },
      body: { organizationId: OTHER },
    };
  }

  it('does not read query or body organizationId', async () => {
    const seen: Array<{ organizationId?: string; input?: { organizationId?: string } }> = [];
    const controller = new CommerceController({
      lastPrice: async (_accountId: string, _productId: string, bound?: TrustedCommerceSession | null) => {
        seen.push({ organizationId: bound?.organizationId });
        return {};
      },
      createQuote: async (input: { organizationId?: string }, bound?: TrustedCommerceSession | null) => {
        seen.push({ organizationId: bound?.organizationId, input });
        return {};
      },
    } as unknown as CommerceService);
    await controller.lastPrice('acct-zeta', 'prod-zeta', request([READ]));
    await controller.createQuote(
      { accountId: 'acct-zeta', items: [{ productId: 'prod-zeta', qty: 1 }], organizationId: OTHER } as never,
      request([READ]),
    );
    assert.equal(seen[0]?.organizationId, SESSION);
    assert.equal(seen[1]?.organizationId, SESSION);
    assert.equal(seen[1]?.input?.organizationId, undefined);
    assertNoLeak(seen[0]);
  });

  it('checks capability before querying on the HTTP path', async () => {
    const { db, calls } = fixture();
    const controller = new CommerceController(new LookupCommerce(db));
    await assertDenied(
      () => controller.lastPrice('acct-zeta', 'prod-zeta', request([PRODUCT_ADMIN])),
      'ROLE_FORBIDDEN',
    );
    await assertDenied(
      () => controller.createQuote({ accountId: 'acct-zeta', items: [{ productId: 'prod-zeta', qty: 1 }] }, request([READ])),
      'ROLE_FORBIDDEN',
    );
    await assertDenied(
      () => controller.pay('inv-zeta', { amountCentavos: 100 }, request([READ])),
      'ROLE_FORBIDDEN',
    );
    assert.equal(calls.length, 0);
    assert.equal(creates(calls, 'quote').length, 0);
    assert.equal(creates(calls, 'payment').length, 0);
  });

  it('foreign id on the HTTP path is the same not-found as missing and stays session scoped', async () => {
    const { db, calls } = fixture();
    const controller = new CommerceController(new LookupCommerce(db));
    await assertMissing(() => controller.getQuote('quote-zeta', request([READ])), QUOTE_MISSING);
    assert.deepEqual(calls[0]?.where, { id: 'quote-zeta', organizationId: SESSION });
    assert.equal(JSON.stringify(calls).includes(OTHER), false);
  });
});
