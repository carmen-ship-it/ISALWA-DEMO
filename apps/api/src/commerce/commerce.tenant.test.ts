import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CommerceService, type CommerceReadDb, type TrustedCommerceSession } from './commerce.service';

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
