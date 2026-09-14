import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CommerceController } from './commerce.controller';
import { CommerceService, type CommerceDetailDb, type CommerceReadDb, type TrustedCommerceSession } from './commerce.service';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COUNT = 7;
const PRODUCT_SCOPE = 'master_data.admin';
const QUOTE_SCOPE = 'commercial.team.read';

type ProductRow = {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  isActive: boolean;
  listPriceCentavos: bigint;
  category: { name: string };
};

type QuoteRow = {
  id: string;
  organizationId: string;
  number: string;
  status: string;
  accountId: string;
  totalCentavos: bigint;
  createdAt: Date;
  sentAt: Date | null;
  account: { tradeName: string | null; legalName: string };
  items: unknown[];
};

function product(id: string, organizationId: string, name: string): ProductRow {
  return {
    id,
    organizationId,
    sku: '',
    name,
    isActive: true,
    listPriceCentavos: 0n,
    category: { name: 'fixture' },
  };
}

function quote(id: string, organizationId: string, accountId: string, name: string): QuoteRow {
  return {
    id,
    organizationId,
    number: '',
    status: 'draft',
    accountId,
    totalCentavos: 0n,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    sentAt: null,
    account: { tradeName: name, legalName: name },
    items: [],
  };
}

function matchesContains(row: Record<string, unknown>, clause: Record<string, { contains: string }>): boolean {
  const entry = Object.entries(clause)[0];
  if (!entry) return false;
  const [field, cond] = entry;
  const value = row[field];
  return typeof value === 'string' && value.toLowerCase().includes(cond.contains.toLowerCase());
}

function fixture(rows?: { products?: ProductRow[]; quotes?: QuoteRow[] }) {
  const products = rows?.products ?? [
    product('prod-alpha', SESSION, SESSION_NAME),
    product('prod-zeta', OTHER, OTHER_NAME),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      product(`prod-zeta-${String.fromCharCode(97 + index)}`, OTHER, OTHER_NAME),
    ),
  ];
  const quotes = rows?.quotes ?? [
    quote('quote-alpha', SESSION, 'acct-alpha', SESSION_NAME),
    quote('quote-zeta', OTHER, 'acct-zeta', OTHER_NAME),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      quote(`quote-zeta-${String.fromCharCode(97 + index)}`, OTHER, 'acct-zeta', OTHER_NAME),
    ),
  ];
  const productCalls: Array<{ where: { organizationId?: string }; take: number }> = [];
  const quoteCalls: Array<{ where: { organizationId?: string; accountId?: string }; take: number }> = [];
  const db = {
    product: {
      async findMany(args: { where: { organizationId?: string; isActive?: boolean; OR?: Array<Record<string, { contains: string }>> }; take: number }) {
        productCalls.push(args);
        return products.filter((row) => {
          if (!args.where.organizationId || row.organizationId !== args.where.organizationId) return false;
          if (args.where.isActive !== undefined && row.isActive !== args.where.isActive) return false;
          if (args.where.OR && !args.where.OR.some((clause) => matchesContains(row, clause))) return false;
          return true;
        }).slice(0, args.take);
      },
    },
    quote: {
      async findMany(args: { where: { organizationId?: string; accountId?: string }; take: number }) {
        quoteCalls.push(args);
        return quotes.filter((row) => {
          if (!args.where.organizationId || row.organizationId !== args.where.organizationId) return false;
          if (args.where.accountId && row.accountId !== args.where.accountId) return false;
          return true;
        }).slice(0, args.take);
      },
    },
  } as CommerceReadDb;
  return { db, productCalls, quoteCalls };
}

function session(scopes: readonly string[]): TrustedCommerceSession {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function service() {
  return new CommerceService({} as never);
}

function assertNoOtherEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes('zeta'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('CommerceService tenant scope', () => {
  it('CommerceService.listProducts same-tenant prefix search is allowed', async () => {
    const { db, productCalls } = fixture();
    const result = await service().listProducts('Alp', session([PRODUCT_SCOPE]), db);
    assert.equal(result.code, null);
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.equal(productCalls[0]?.take, 40);
    assert.equal(result.items.some((item) => item.name === SESSION_NAME), true);
    assert.equal(result.items.every((item) => item.name.startsWith('Alpha')), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listProducts same-tenant wrong role is denied', async () => {
    const { db, productCalls } = fixture();
    const result = await service().listProducts('Alpha', session([QUOTE_SCOPE]), db);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(productCalls.length, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listProducts cross-tenant prefix is not queried', async () => {
    const { db, productCalls } = fixture();
    const result = await service().listProducts('Zeta', session([PRODUCT_SCOPE]), db);
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.notEqual(productCalls[0]?.where.organizationId, OTHER);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listProducts missing session is denied', async () => {
    const { db, productCalls } = fixture();
    const result = await service().listProducts('Zeta', null, db);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(productCalls.length, 0);
    assert.deepEqual(result.items, []);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listProducts pagination take is scoped to the session tenant', async () => {
    const products = [
      ...Array.from({ length: 41 }, (_, index) => product(`prod-alpha-${index}`, SESSION, `${SESSION_NAME} ${index}`)),
      product('prod-zeta', OTHER, OTHER_NAME),
    ];
    const { db, productCalls } = fixture({ products });
    const result = await service().listProducts(undefined, session([PRODUCT_SCOPE]), db);
    assert.equal(productCalls[0]?.take, 40);
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.length, 40);
    assert.equal(result.count, 40);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listProducts count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await service().listProducts('Zeta', session([PRODUCT_SCOPE]), db);
    assert.equal(result.count, 0);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listQuotes same-tenant list is allowed', async () => {
    const { db, quoteCalls } = fixture();
    const result = await service().listQuotes(undefined, session([QUOTE_SCOPE]), db);
    assert.equal(result.code, null);
    assert.equal(quoteCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.some((item) => item.accountName === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listQuotes same-tenant wrong role is denied', async () => {
    const { db, quoteCalls } = fixture();
    const result = await service().listQuotes(undefined, session([PRODUCT_SCOPE]), db);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(quoteCalls.length, 0);
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listQuotes cross-tenant account id returns no quotes', async () => {
    const { db, quoteCalls } = fixture();
    const result = await service().listQuotes('acct-zeta', session([QUOTE_SCOPE]), db);
    assert.equal(quoteCalls[0]?.where.organizationId, SESSION);
    assert.equal(quoteCalls[0]?.where.accountId, 'acct-zeta');
    assert.deepEqual(result.items, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listQuotes missing session is denied', async () => {
    const { db, quoteCalls } = fixture();
    const result = await service().listQuotes('acct-zeta', undefined, db);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(quoteCalls.length, 0);
    assert.deepEqual(result.items, []);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listQuotes pagination take is scoped to the session tenant', async () => {
    const quotes = [
      ...Array.from({ length: 31 }, (_, index) =>
        quote(`quote-alpha-${index}`, SESSION, 'acct-alpha', SESSION_NAME),
      ),
      quote('quote-zeta', OTHER, 'acct-zeta', OTHER_NAME),
    ];
    const { db, quoteCalls } = fixture({ quotes });
    const result = await service().listQuotes(undefined, session([QUOTE_SCOPE]), db);
    assert.equal(quoteCalls[0]?.take, 30);
    assert.equal(quoteCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.items.length, 30);
    assert.equal(result.count, 30);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.listQuotes count excludes the other tenant', async () => {
    const { db } = fixture();
    const result = await service().listQuotes('acct-zeta', session([QUOTE_SCOPE]), db);
    assert.equal(result.count, 0);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});

const OTHER_PRICE = 700;

function quoteDetail(id: string, organizationId: string, name: string) {
  return {
    id,
    organizationId,
    number: '',
    status: 'draft',
    accountId: `acct-${id}`,
    notes: null,
    validUntil: new Date('2026-02-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    sentAt: null,
    acceptedAt: null,
    subtotalCentavos: 0n,
    taxCentavos: 0n,
    totalCentavos: 0n,
    account: { tradeName: name, legalName: name, code: id, organizationId },
    owner: { name: 'owner' },
    items: [],
    orders: [],
  };
}

function invoiceDetail(id: string, organizationId: string, name: string) {
  return {
    id,
    organizationId,
    number: '',
    status: 'open',
    accountId: `acct-${id}`,
    issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    dueAt: new Date('2026-02-01T00:00:00.000Z'),
    totalCentavos: 0n,
    balanceCentavos: 0n,
    orderId: null,
    account: { tradeName: name, legalName: name, organizationId },
    order: null,
    items: [],
    allocations: [],
  };
}

function detailFixture() {
  const accounts = [
    { id: 'acct-alpha', organizationId: SESSION },
    { id: 'acct-zeta', organizationId: OTHER },
  ];
  const products = [
    { id: 'prod-alpha', organizationId: SESSION, sku: '', name: SESSION_NAME, listPriceCentavos: 0n },
    { id: 'prod-zeta', organizationId: OTHER, sku: '', name: OTHER_NAME, listPriceCentavos: BigInt(OTHER_PRICE) },
    { id: 'prod-zeta-prefix-long', organizationId: OTHER, sku: '', name: OTHER_NAME, listPriceCentavos: BigInt(OTHER_PRICE) },
  ];
  const observations = [
    { accountId: 'acct-alpha', productId: 'prod-alpha', organizationId: SESSION, unitPriceCentavos: 0n, observedAt: new Date('2026-01-02T00:00:00.000Z'), source: 'quote' },
    { accountId: 'acct-zeta', productId: 'prod-zeta', organizationId: OTHER, unitPriceCentavos: BigInt(OTHER_PRICE), observedAt: new Date('2026-01-02T00:00:00.000Z'), source: 'quote' },
  ];
  const quotes = [quoteDetail('quote-alpha', SESSION, SESSION_NAME), quoteDetail('quote-zeta', OTHER, OTHER_NAME)];
  const invoices = [invoiceDetail('inv-alpha', SESSION, SESSION_NAME), invoiceDetail('inv-zeta', OTHER, OTHER_NAME)];
  const accountCalls: Array<{ where: { id?: string; organizationId?: string } }> = [];
  const productCalls: Array<{ where: { id?: string; organizationId?: string } }> = [];
  const observationCalls: Array<{ where: { organizationId?: string } }> = [];
  const quoteCalls: Array<{ where: { id?: string; organizationId?: string } }> = [];
  const invoiceCalls: Array<{ where: { id?: string; organizationId?: string } }> = [];
  const db = {
    account: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        accountCalls.push(args);
        const found = accounts.find((row) => row.id === args.where.id && row.organizationId === args.where.organizationId);
        return found ? { id: found.id } : null;
      },
    },
    product: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        productCalls.push(args);
        return products.find((row) => row.id === args.where.id && row.organizationId === args.where.organizationId) ?? null;
      },
    },
    priceObservation: {
      async findFirst(args: { where: { accountId: string; productId: string; organizationId: string } }) {
        observationCalls.push(args);
        return (
          observations.find(
            (row) =>
              row.accountId === args.where.accountId &&
              row.productId === args.where.productId &&
              row.organizationId === args.where.organizationId,
          ) ?? null
        );
      },
    },
    quote: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        quoteCalls.push(args);
        return quotes.find((row) => row.id === args.where.id && row.organizationId === args.where.organizationId) ?? null;
      },
    },
    invoice: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        invoiceCalls.push(args);
        return invoices.find((row) => row.id === args.where.id && row.organizationId === args.where.organizationId) ?? null;
      },
    },
  } as CommerceDetailDb;
  return { db, accountCalls, productCalls, observationCalls, quoteCalls, invoiceCalls };
}

describe('CommerceService direct resource tenant scope', () => {
  it('CommerceService.lastPrice same-tenant account and product is allowed', async () => {
    const { db, accountCalls, productCalls } = detailFixture();
    const result = await service().lastPrice('acct-alpha', 'prod-alpha', session([QUOTE_SCOPE]), db);
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal(accountCalls[0]?.where.organizationId, SESSION);
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.name, SESSION_NAME);
    assert.equal(result.suggestedUnitPriceCentavos, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.lastPrice same-tenant wrong role is denied', async () => {
    const { db, accountCalls } = detailFixture();
    const result = await service().lastPrice('acct-alpha', 'prod-alpha', session([PRODUCT_SCOPE]), db);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(accountCalls.length, 0);
    assert.equal(result.count, 0);
    assert.equal(result.productId, null);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.lastPrice cross-tenant account id and product id return no row', async () => {
    const { db, accountCalls, productCalls } = detailFixture();
    const foreignAccount = await service().lastPrice('acct-zeta', 'prod-alpha', session([QUOTE_SCOPE]), db);
    const foreignProduct = await service().lastPrice('acct-alpha', 'prod-zeta', session([QUOTE_SCOPE]), db);
    const prefix = await service().lastPrice('acct-alpha', 'prod-zeta-pre', session([QUOTE_SCOPE]), db);
    assert.equal(accountCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(productCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(foreignAccount.count, 0);
    assert.equal(foreignProduct.count, 0);
    assert.equal(prefix.count, 0);
    assert.equal(foreignAccount.productId, null);
    assert.equal(foreignProduct.name, null);
    assert.notEqual(foreignProduct.suggestedUnitPriceCentavos, OTHER_PRICE);
    assertNoOtherEvidence(JSON.stringify(foreignAccount) + JSON.stringify(foreignProduct) + JSON.stringify(prefix));
  });

  it('CommerceService.lastPrice missing session is denied', async () => {
    const { db, accountCalls } = detailFixture();
    const result = await service().lastPrice('acct-zeta', 'prod-zeta', null, db);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(accountCalls.length, 0);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.lastPrice count excludes the other tenant price', async () => {
    const { db } = detailFixture();
    const result = await service().lastPrice('acct-zeta', 'prod-zeta', session([QUOTE_SCOPE]), db);
    assert.equal(result.count, 0);
    assert.notEqual(result.suggestedUnitPriceCentavos, OTHER_PRICE);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getQuote same-tenant id is allowed', async () => {
    const { db, quoteCalls } = detailFixture();
    const result = await service().getQuote('quote-alpha', session([QUOTE_SCOPE]), db);
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal(quoteCalls[0]?.where.organizationId, SESSION);
    assert.equal('accountName' in result && result.accountName, SESSION_NAME);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getQuote same-tenant wrong role is denied', async () => {
    const { db, quoteCalls } = detailFixture();
    const result = await service().getQuote('quote-alpha', session([PRODUCT_SCOPE]), db);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(quoteCalls.length, 0);
    assert.equal(result.count, 0);
    assert.equal('id' in result, false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getQuote cross-tenant id and prefix return no row', async () => {
    const { db, quoteCalls } = detailFixture();
    const byId = await service().getQuote('quote-zeta', session([QUOTE_SCOPE]), db);
    const byPrefix = await service().getQuote('quote-ze', session([QUOTE_SCOPE]), db);
    assert.equal(quoteCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(byId.count, 0);
    assert.equal(byPrefix.count, 0);
    assert.equal('number' in byId, false);
    assert.equal('accountName' in byId, false);
    assertNoOtherEvidence(JSON.stringify(byId) + JSON.stringify(byPrefix));
  });

  it('CommerceService.getQuote missing session is denied', async () => {
    const { db, quoteCalls } = detailFixture();
    const result = await service().getQuote('quote-zeta', undefined, db);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(quoteCalls.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getQuote count excludes the other tenant', async () => {
    const { db } = detailFixture();
    const result = await service().getQuote('quote-zeta', session([QUOTE_SCOPE]), db);
    assert.equal(result.count, 0);
    assert.notEqual(result.count, 1);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getInvoice same-tenant id is allowed', async () => {
    const { db, invoiceCalls } = detailFixture();
    const result = await service().getInvoice('inv-alpha', session([QUOTE_SCOPE]), db);
    assert.equal(result.code, null);
    assert.equal(result.count, 1);
    assert.equal(invoiceCalls[0]?.where.organizationId, SESSION);
    assert.equal('accountName' in result && result.accountName, SESSION_NAME);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getInvoice same-tenant wrong role is denied', async () => {
    const { db, invoiceCalls } = detailFixture();
    const result = await service().getInvoice('inv-alpha', session([PRODUCT_SCOPE]), db);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(invoiceCalls.length, 0);
    assert.equal('id' in result, false);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getInvoice cross-tenant id and prefix return no row', async () => {
    const { db, invoiceCalls } = detailFixture();
    const byId = await service().getInvoice('inv-zeta', session([QUOTE_SCOPE]), db);
    const byPrefix = await service().getInvoice('inv-ze', session([QUOTE_SCOPE]), db);
    assert.equal(invoiceCalls.every((call) => call.where.organizationId === SESSION), true);
    assert.equal(byId.count, 0);
    assert.equal(byPrefix.count, 0);
    assert.equal('accountName' in byId, false);
    assertNoOtherEvidence(JSON.stringify(byId) + JSON.stringify(byPrefix));
  });

  it('CommerceService.getInvoice missing session is denied', async () => {
    const { db, invoiceCalls } = detailFixture();
    const result = await service().getInvoice('inv-zeta', null, db);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(invoiceCalls.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('CommerceService.getInvoice count excludes the other tenant', async () => {
    const { db } = detailFixture();
    const result = await service().getInvoice('inv-zeta', session([QUOTE_SCOPE]), db);
    assert.equal(result.count, 0);
    assert.notEqual(result.count, 1);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});

describe('CommerceController session boundary', () => {
  it('CommerceController.products passes the session and ignores caller organizationId', async () => {
    const { db, productCalls } = fixture();
    const controller = new CommerceController(service());
    const missing = await controller.products('Zeta', {
      query: { organizationId: OTHER },
      headers: { 'x-organization-id': OTHER },
      readDb: db,
    });
    assert.equal(missing.code, 'AUTH_REQUIRED');
    assert.equal(productCalls.length, 0);

    const allowed = await controller.products('Alp', {
      authenticatedSession: {
        authenticated: true,
        organizationId: SESSION,
        grantedScopes: [PRODUCT_SCOPE],
      },
      query: { organizationId: OTHER },
      headers: { 'x-organization-id': OTHER },
      readDb: db,
    });
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.equal(allowed.items.some((item) => item.name === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(missing));
  });

  it('CommerceController.listQuotes passes the session and ignores caller organizationId', async () => {
    const { db, quoteCalls } = fixture();
    const controller = new CommerceController(service());
    const missing = await controller.listQuotes('acct-zeta', {
      query: { organizationId: OTHER },
      headers: { 'x-organization-id': OTHER },
      readDb: db,
    });
    assert.equal(missing.code, 'AUTH_REQUIRED');
    assert.equal(quoteCalls.length, 0);

    const allowed = await controller.listQuotes(undefined, {
      authenticatedSession: {
        authenticated: true,
        organizationId: SESSION,
        grantedScopes: [QUOTE_SCOPE],
      },
      query: { organizationId: OTHER },
      readDb: db,
    });
    assert.equal(quoteCalls[0]?.where.organizationId, SESSION);
    assert.equal(allowed.count, 1);
    assertNoOtherEvidence(JSON.stringify(missing));
  });

  it('CommerceController.lastPrice missing session is denied', async () => {
    const { db, accountCalls } = detailFixture();
    const result = await new CommerceController(service()).lastPrice('acct-zeta', 'prod-zeta', {
      query: { organizationId: OTHER },
      headers: { 'x-organization-id': OTHER },
      readDb: db,
    });
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(accountCalls.length, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});
