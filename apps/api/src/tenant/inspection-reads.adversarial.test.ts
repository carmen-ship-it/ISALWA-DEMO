/**
 * Inspection inventory for apps/api read handlers.
 *
 * The 15 already LOCAL_FUNCTION_VERIFIED reads are not recounted and are not
 * re-tested here: search, products, quotes, timeline, questions, contacts,
 * conversations, territory, accounts, radar, pulse, lastPrice, getQuote,
 * getInvoice, health ready.
 *
 * Remaining apps/api GET /health is a process check. It is not a tenant read
 * and is not LOCAL_FUNCTION_VERIFIED.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ALREADY_VERIFIED_ELSEWHERE = [
  'search',
  'products',
  'quotes',
  'timeline',
  'questions',
  'contacts',
  'conversations',
  'territory',
  'accounts',
  'radar',
  'pulse',
  'lastPrice',
  'getQuote',
  'getInvoice',
  'health ready',
] as const;

/**
 * apps/api GET handlers. questions and contacts are verified in search
 * extensions, not as additional apps/api routes. health ready is os-api.
 */
const API_GET_CLASSIFICATION: Record<string, string> = {
  'GET /search': 'ALREADY_VERIFIED_ELSEWHERE:search',
  'GET /products': 'ALREADY_VERIFIED_ELSEWHERE:products',
  'GET /quotes': 'ALREADY_VERIFIED_ELSEWHERE:quotes',
  'GET /quotes/:id': 'ALREADY_VERIFIED_ELSEWHERE:getQuote',
  'GET /accounts/:accountId/products/:productId/last-price': 'ALREADY_VERIFIED_ELSEWHERE:lastPrice',
  'GET /invoices/:id': 'ALREADY_VERIFIED_ELSEWHERE:getInvoice',
  'GET /conversations': 'ALREADY_VERIFIED_ELSEWHERE:conversations',
  'GET /conversations/:id': 'ALREADY_VERIFIED_ELSEWHERE:conversations',
  'GET /territorio/points': 'ALREADY_VERIFIED_ELSEWHERE:territory',
  'GET /accounts': 'ALREADY_VERIFIED_ELSEWHERE:accounts',
  'GET /accounts/:id': 'ALREADY_VERIFIED_ELSEWHERE:accounts',
  'GET /accounts/:id/timeline': 'ALREADY_VERIFIED_ELSEWHERE:timeline',
  'GET /radar/items': 'ALREADY_VERIFIED_ELSEWHERE:radar',
  'GET /pulse': 'ALREADY_VERIFIED_ELSEWHERE:pulse',
  'GET /health': 'NON_TENANT',
};

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (name.endsWith('.controller.ts')) files.push(path);
  }
  return files;
}

function getRoutes(source: string): string[] {
  const routes: string[] = [];
  for (const chunk of source.split(/@Controller\(/).slice(1)) {
    const prefix = chunk.match(/^['"]([^'"]*)['"]/)?.[1] ?? '';
    for (const match of chunk.matchAll(/@Get\(\s*(?:['"]([^'"]*)['"])?\s*\)/g)) {
      const sub = match[1] ?? '';
      const segments = [prefix, sub].filter((part) => part.length > 0);
      routes.push(`GET /${segments.join('/')}`);
    }
  }
  return routes;
}

describe('apps/api inspection read inventory', () => {
  it('does not recount the 15 already-verified reads as new proofs', () => {
    assert.equal(ALREADY_VERIFIED_ELSEWHERE.length, 15);
    const recounted = Object.values(API_GET_CLASSIFICATION).filter((value) =>
      value.startsWith('LOCAL_FUNCTION_VERIFIED'),
    );
    assert.deepEqual(recounted, []);
    assert.equal(
      Object.values(API_GET_CLASSIFICATION).some((value) => value.includes('health ready')),
      false,
    );
  });

  it('classifies every apps/api GET and leaves GET /health as a non-tenant process check', () => {
    const src = new URL('../', import.meta.url).pathname;
    const found = walk(src)
      .flatMap((file) => getRoutes(readFileSync(file, 'utf8')))
      .sort();
    assert.deepEqual(found, Object.keys(API_GET_CLASSIFICATION).sort());
    assert.equal(API_GET_CLASSIFICATION['GET /health'], 'NON_TENANT');

    const health = readFileSync(new URL('../health/health.controller.ts', import.meta.url), 'utf8');
    assert.equal(health.includes('organizationId'), false);
    assert.equal(health.includes('grantedScopes'), false);
  });
});
