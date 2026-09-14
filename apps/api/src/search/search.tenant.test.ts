import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SearchController } from './search.controller';
import {
  ACCOUNT_SEARCH_SCOPE,
  PRODUCT_SEARCH_SCOPE,
  type AccountFindManyArgs,
  type AccountSearchRow,
  type ProductFindManyArgs,
  type ProductSearchRow,
  type SearchReadDb,
} from './search-query';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const SESSION_NAME = 'AlphaSessionName';
const OTHER_COUNT = 7;

type ContainsClause = Record<string, { contains: string; mode: 'insensitive' }>;

function matchesContains(row: Record<string, unknown>, clause: ContainsClause): boolean {
  const entry = Object.entries(clause)[0];
  if (!entry) return false;
  const [field, cond] = entry;
  const value = row[field];
  if (typeof value !== 'string') return false;
  return value.toLowerCase().includes(cond.contains.toLowerCase());
}

function accountMatches(row: AccountSearchRow, where: AccountFindManyArgs['where']): boolean {
  if (!where.organizationId || row.organizationId !== where.organizationId) return false;
  return where.OR.some((clause) => matchesContains(row, clause));
}

function productMatches(row: ProductSearchRow, where: ProductFindManyArgs['where']): boolean {
  if (!where.organizationId || row.organizationId !== where.organizationId) return false;
  return where.OR.some((clause) => matchesContains(row, clause));
}

function account(id: string, organizationId: string, name: string): AccountSearchRow {
  return {
    id,
    organizationId,
    code: id,
    legalName: name,
    tradeName: name,
    segment: 'A',
    relationshipScore: 1,
  };
}

function product(id: string, organizationId: string, name: string): ProductSearchRow {
  return { id, organizationId, name, sku: '' };
}

function fixtureDb(rows?: { accounts?: AccountSearchRow[]; products?: ProductSearchRow[] }) {
  const accounts = rows?.accounts ?? [
    account('acct-alpha', SESSION, SESSION_NAME),
    account('acct-zeta', OTHER, OTHER_NAME),
    ...Array.from({ length: OTHER_COUNT }, (_, index) =>
      account(`acct-zeta-${String.fromCharCode(97 + index)}`, OTHER, OTHER_NAME),
    ),
  ];
  const products = rows?.products ?? [
    product('prod-alpha', SESSION, SESSION_NAME),
    product('prod-zeta', OTHER, OTHER_NAME),
  ];
  const accountCalls: AccountFindManyArgs[] = [];
  const productCalls: ProductFindManyArgs[] = [];
  const db: SearchReadDb = {
    account: {
      async findMany(args) {
        accountCalls.push(args);
        return accounts.filter((row) => accountMatches(row, args.where)).slice(0, args.take);
      },
    },
    product: {
      async findMany(args) {
        productCalls.push(args);
        return products.filter((row) => productMatches(row, args.where)).slice(0, args.take);
      },
    },
  };
  return { db, accountCalls, productCalls };
}

function session(scopes: readonly string[]) {
  return {
    authenticated: true as const,
    organizationId: SESSION,
    grantedScopes: scopes,
  };
}

async function search(
  query: string,
  limit: string,
  grantedScopes: readonly string[] | null,
  rows?: { accounts?: AccountSearchRow[]; products?: ProductSearchRow[] },
  callerOrganizationId?: string,
) {
  const { db, accountCalls, productCalls } = fixtureDb(rows);
  const controller = new SearchController();
  const result = await controller.search(query, limit, {
    authenticatedSession: grantedScopes ? session(grantedScopes) : undefined,
    query: { organizationId: callerOrganizationId },
    readDb: db,
  });
  return { result, accountCalls, productCalls };
}

function assertNoOtherEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes('acct-zeta'), false);
  assert.equal(serialized.includes('prod-zeta'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('SearchController.search tenant scope', () => {
  it('SearchController.search same-tenant account and product query is allowed', async () => {
    const { result, accountCalls, productCalls } = await search('Alpha', '10', [
      ACCOUNT_SEARCH_SCOPE,
      PRODUCT_SEARCH_SCOPE,
    ]);
    assert.equal(result.code, null);
    assert.equal(accountCalls[0]?.where.organizationId, SESSION);
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.results.some((hit) => hit.title === SESSION_NAME && hit.type === 'account'), true);
    assert.equal(result.results.some((hit) => hit.title === SESSION_NAME && hit.type === 'product'), true);
    assert.equal(result.autocomplete.some((hit) => hit.title === SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search same-tenant wrong role denies account search', async () => {
    const { result, accountCalls } = await search('Alpha', '10', [PRODUCT_SEARCH_SCOPE]);
    assert.equal(accountCalls.length, 0);
    assert.equal(result.results.some((hit) => hit.type === 'account'), false);
    assert.equal(result.code, null);
    assert.equal(result.results.every((hit) => hit.type === 'product'), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search same-tenant wrong role denies product search', async () => {
    const { result, productCalls } = await search('Alpha', '10', [ACCOUNT_SEARCH_SCOPE]);
    assert.equal(productCalls.length, 0);
    assert.equal(result.results.some((hit) => hit.type === 'product'), false);
    assert.equal(result.code, null);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search same-tenant with neither read scope is denied', async () => {
    const { result, accountCalls, productCalls } = await search('Alpha', '10', ['people.admin']);
    assert.equal(result.code, 'ROLE_FORBIDDEN');
    assert.equal(accountCalls.length, 0);
    assert.equal(productCalls.length, 0);
    assert.deepEqual(result.results, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search cross-tenant prefix does not enter the account or product query', async () => {
    const { result, accountCalls, productCalls } = await search('Zeta', '10', [
      ACCOUNT_SEARCH_SCOPE,
      PRODUCT_SEARCH_SCOPE,
    ]);
    assert.equal(accountCalls[0]?.where.organizationId, SESSION);
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.notEqual(accountCalls[0]?.where.organizationId, OTHER);
    assert.deepEqual(result.results, []);
    assert.deepEqual(result.autocomplete, []);
    assert.deepEqual(result.suggestions, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search missing session is denied and does not query', async () => {
    const { result, accountCalls, productCalls } = await search('Zeta', '10', null);
    assert.equal(result.code, 'AUTH_REQUIRED');
    assert.equal(accountCalls.length, 0);
    assert.equal(productCalls.length, 0);
    assert.deepEqual(result.results, []);
    assert.equal(result.count, 0);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search ignores a caller-supplied organizationId', async () => {
    const { result, accountCalls, productCalls } = await search(
      'Alpha',
      '10',
      [ACCOUNT_SEARCH_SCOPE, PRODUCT_SEARCH_SCOPE],
      undefined,
      OTHER,
    );
    assert.equal(accountCalls[0]?.where.organizationId, SESSION);
    assert.equal(productCalls[0]?.where.organizationId, SESSION);
    assert.notEqual(accountCalls[0]?.where.organizationId, OTHER);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search autocomplete prefix returns only the session tenant', async () => {
    const { result } = await search('Alp', '10', [ACCOUNT_SEARCH_SCOPE, PRODUCT_SEARCH_SCOPE]);
    assert.equal(result.autocomplete.length > 0, true);
    assert.equal(result.suggestions.every((hit) => hit.title.startsWith('Alpha')), true);
    assert.equal(result.autocomplete.every((hit) => !hit.title.startsWith('Zeta')), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search count excludes the other tenant', async () => {
    const { result } = await search('Zeta', '10', [ACCOUNT_SEARCH_SCOPE, PRODUCT_SEARCH_SCOPE]);
    assert.equal(result.count, 0);
    assert.notEqual(result.count, OTHER_COUNT);
    assertNoOtherEvidence(JSON.stringify(result));
  });

  it('SearchController.search pagination stays inside the session tenant', async () => {
    const accounts = [
      account('acct-alpha-a', SESSION, `${SESSION_NAME} A`),
      account('acct-alpha-b', SESSION, `${SESSION_NAME} B`),
      account('acct-alpha-c', SESSION, `${SESSION_NAME} C`),
      account('acct-zeta', OTHER, OTHER_NAME),
    ];
    const { result, accountCalls } = await search('Alpha', '1', [ACCOUNT_SEARCH_SCOPE], { accounts, products: [] });
    assert.equal(accountCalls[0]?.take, 4);
    assert.equal(accountCalls[0]?.where.organizationId, SESSION);
    assert.equal(result.results.filter((hit) => hit.type === 'account').length, 1);
    assert.equal(result.results[0]?.title.startsWith(SESSION_NAME), true);
    assertNoOtherEvidence(JSON.stringify(result));
  });
});
