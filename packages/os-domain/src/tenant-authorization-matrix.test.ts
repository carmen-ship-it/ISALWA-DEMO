import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertTenantMatch } from './authorization';
import {
  TENANT_SURFACES,
  TENANT_SURFACE_REQUIRED_SCOPE,
  readTenantSurface,
  type TenantDenialCode,
  type TenantReadResult,
  type TenantSurface,
  type TenantSurfaceRow,
} from './tenant-read-gate';

/**
 * Fixture organizations only. Not the seven real customers.
 * Labels carry no price, SKU, or stock.
 *
 * Existing list functions this lane does not own, and must not rewrite.
 * Each can return another tenant's row. The suite must still pass by proving
 * readTenantSurface would deny or drop that row. A missing file is not a failure.
 *
 * - apps/api/src/search/search.controller.ts SearchController.search
 *   account and product findMany have no organization predicate, so a label
 *   or prefix query returns every matching account, including another tenant.
 * - apps/api/src/commerce/commerce.service.ts CommerceService.listProducts
 *   and listQuotes have no organization predicate.
 * - packages/database/src/timeline/read.ts listAccountTimeline filters by
 *   accountId only.
 * - packages/os-contracts/src/conversation-evidence.ts
 *   listUnconfirmedCustomerQuestions returns question text from every message
 *   and does not read organizationId.
 * - apps/os-web/lib/productivity/search-extensions.ts matchingContacts matches
 *   name, email, and phone with no organization filter.
 */
const LEAKY_LIST_PATHS = [
  'apps/api/src/search/search.controller.ts',
  'apps/api/src/commerce/commerce.service.ts',
  'packages/database/src/timeline/read.ts',
  'packages/os-contracts/src/conversation-evidence.ts',
  'apps/os-web/lib/productivity/search-extensions.ts',
] as const;

const SESSION_ORG_ID = 'org-session-alpha';
const OTHER_ORG_ID = 'org-other-zeta';
const OTHER_NAME = 'ZetaOtherName';
const OTHER_SUGGESTION = 'ZetaOtherSuggestion';
const SESSION_NAME = 'AlphaSessionName';
const SESSION_SUGGESTION = 'AlphaSessionSuggestion';
const OTHER_ROW_ID = 'row-other-zeta';
const SESSION_ROW_ID = 'row-session-alpha';
/** Fixture cardinality only. Not a stock quantity. */
const OTHER_TENANT_COUNT = 7;
const OTHER_PREFIX = 'ZetaOtherN';

const MISSING_SESSION = [null, undefined, ''] as const;

type LeakTokens = {
  otherOrgId: string;
  otherName: string;
  otherSuggestion: string;
  otherRowId: string;
  otherCount: number;
};

const LEAK: LeakTokens = {
  otherOrgId: OTHER_ORG_ID,
  otherName: OTHER_NAME,
  otherSuggestion: OTHER_SUGGESTION,
  otherRowId: OTHER_ROW_ID,
  otherCount: OTHER_TENANT_COUNT,
};

function sessionRow(surface: TenantSurface): TenantSurfaceRow {
  return {
    id: `${SESSION_ROW_ID}-${surface}`,
    organizationId: SESSION_ORG_ID,
    label: `${SESSION_NAME} ${SESSION_SUGGESTION} ${surface}`,
  };
}

function otherRow(surface: TenantSurface, index = 0): TenantSurfaceRow {
  return {
    id: `${OTHER_ROW_ID}-${surface}-${index}`,
    organizationId: OTHER_ORG_ID,
    label: `${OTHER_NAME} ${OTHER_SUGGESTION} ${surface}`,
  };
}

function mixedRows(surface: TenantSurface): TenantSurfaceRow[] {
  return [otherRow(surface), sessionRow(surface)];
}

function otherOnlyRows(surface: TenantSurface): TenantSurfaceRow[] {
  return Array.from({ length: OTHER_TENANT_COUNT }, (_, index) => otherRow(surface, index));
}

function assertNoOtherTenantLeak(result: TenantReadResult, tokens: LeakTokens = LEAK): void {
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(tokens.otherOrgId), false, 'denial or filter leaked other org id');
  assert.equal(serialized.includes(tokens.otherName), false, 'denial or filter leaked other tenant name');
  assert.equal(
    serialized.includes(tokens.otherSuggestion),
    false,
    'denial or filter leaked other suggestion text',
  );
  assert.equal(serialized.includes(tokens.otherRowId), false, 'denial or filter leaked other row id');
  assert.equal(serialized.includes(`"count":${tokens.otherCount}`), false, 'leaked other tenant count');
  assert.equal(result.count === tokens.otherCount, false, 'returned the other tenant count');
}

function assertDenied(
  result: TenantReadResult,
  code: TenantDenialCode,
  tokens: LeakTokens = LEAK,
): void {
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, code);
  assert.deepEqual(result.rows, []);
  assert.equal(result.count, 0);
  assert.deepEqual(result.suggestions, []);
  assert.deepEqual(result.autocomplete, []);
  assert.deepEqual(result.recent, []);
  assert.deepEqual(result.quickView, []);
  assertNoOtherTenantLeak(result, tokens);
  assert.equal(JSON.stringify(result).includes(SESSION_ROW_ID), false);
  assert.equal(JSON.stringify(result).includes(SESSION_NAME), false);
}

describe('tenant authorization matrix', () => {
  it('assertTenantMatch throws TENANT_FORBIDDEN for a different organization', () => {
    assert.throws(() => assertTenantMatch(SESSION_ORG_ID, OTHER_ORG_ID), /TENANT_FORBIDDEN/);
    assert.doesNotThrow(() => assertTenantMatch(SESSION_ORG_ID, SESSION_ORG_ID));
  });

  it('tenant surface catalog names every read surface', () => {
    assert.deepEqual([...TENANT_SURFACES], [
      'customer',
      'contact',
      'opportunity',
      'quote',
      'quote_line',
      'order',
      'order_line',
      'product',
      'price_list',
      'price_entry',
      'production_record',
      'quema',
      'loss',
      'consumption',
      'finished_goods_receipt',
      'order_allocation',
      'purchase_request',
      'operational_case',
      'customer_communication',
      'warehouse_exit',
      'delivery',
      'delivery_note',
      'coordination_decision',
      'work_item',
      'attention',
      'global_search',
      'management_command_center',
    ]);
  });

  for (const [index, surface] of TENANT_SURFACES.entries()) {
    const requiredScope = TENANT_SURFACE_REQUIRED_SCOPE[surface];
    const granted = [requiredScope];
    const session = sessionRow(surface);
    const other = otherRow(surface);

    it(`${surface}: same-tenant with required scope returns only that tenant's rows`, () => {
      const result = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: SESSION_ORG_ID,
        grantedScopes: granted,
        requiredScope,
        rows: mixedRows(surface),
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.code, null);
      assert.deepEqual(result.rows, [session]);
      assert.equal(result.count, 1);
      assert.equal(result.rows.some((row) => row.organizationId === OTHER_ORG_ID), false);
      assertNoOtherTenantLeak(result);
      assert.equal(JSON.stringify(result).includes(other.id), false);
    });

    it(`${surface}: same-tenant without required scope returns ROLE_FORBIDDEN and zero rows`, () => {
      const result = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: SESSION_ORG_ID,
        grantedScopes: ['people.admin'],
        requiredScope,
        rows: mixedRows(surface),
      });
      assertDenied(result, 'ROLE_FORBIDDEN');
    });

    it(`${surface}: cross-tenant session returns TENANT_FORBIDDEN and zero rows`, () => {
      const result = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: OTHER_ORG_ID,
        grantedScopes: granted,
        requiredScope,
        rows: mixedRows(surface),
        query: OTHER_PREFIX,
      });
      assertDenied(result, 'TENANT_FORBIDDEN');
    });

    it(`${surface}: missing session organization returns AUTH_REQUIRED and zero rows`, () => {
      const result = readTenantSurface({
        surface,
        sessionOrganizationId: MISSING_SESSION[index % MISSING_SESSION.length],
        resourceOrganizationId: OTHER_ORG_ID,
        grantedScopes: granted,
        requiredScope,
        rows: mixedRows(surface),
        query: OTHER_PREFIX,
      });
      assertDenied(result, 'AUTH_REQUIRED');
    });

    it(`${surface}: search suggestions and autocomplete exclude the other tenant including a prefix match`, () => {
      const result = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: SESSION_ORG_ID,
        grantedScopes: granted,
        requiredScope,
        rows: mixedRows(surface),
        query: OTHER_PREFIX,
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(result.suggestions, []);
      assert.deepEqual(result.autocomplete, []);
      assert.equal(result.suggestions.some((row) => row.id === other.id), false);
      assert.equal(result.autocomplete.some((row) => row.label.startsWith(OTHER_PREFIX)), false);
      assertNoOtherTenantLeak(result);

      const sessionQuery = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: SESSION_ORG_ID,
        grantedScopes: granted,
        requiredScope,
        rows: mixedRows(surface),
        query: 'AlphaSession',
      });
      assert.equal(sessionQuery.ok, true);
      if (!sessionQuery.ok) return;
      assert.deepEqual(sessionQuery.suggestions, [session]);
      assert.deepEqual(sessionQuery.autocomplete, [session]);
      assertNoOtherTenantLeak(sessionQuery);
    });

    it(`${surface}: count for the session tenant excludes the other tenant and a zero stays zero`, () => {
      const result = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: SESSION_ORG_ID,
        grantedScopes: granted,
        requiredScope,
        rows: otherOnlyRows(surface),
        query: OTHER_PREFIX,
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.count, 0);
      assert.deepEqual(result.rows, []);
      assert.deepEqual(result.suggestions, []);
      assert.deepEqual(result.autocomplete, []);
      assert.notEqual(result.count, OTHER_TENANT_COUNT);
      assertNoOtherTenantLeak(result);
    });

    it(`${surface}: recent-item list and quick-view option follow the same tenant filter`, () => {
      const result = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: SESSION_ORG_ID,
        grantedScopes: granted,
        requiredScope,
        rows: mixedRows(surface),
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(result.recent, [session]);
      assert.deepEqual(result.quickView, [session]);
      assert.equal(result.recent.some((row) => row.organizationId === OTHER_ORG_ID), false);
      assert.equal(result.quickView.some((row) => row.id === other.id), false);
      assertNoOtherTenantLeak(result);
    });
  }

  it('unscoped list functions would leak another tenant; readTenantSurface denies those rows for every surface', () => {
    assert.equal(LEAKY_LIST_PATHS.length > 0, true);
    for (const surface of TENANT_SURFACES) {
      const requiredScope = TENANT_SURFACE_REQUIRED_SCOPE[surface];
      const leaked = mixedRows(surface);
      const denied = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: OTHER_ORG_ID,
        grantedScopes: [requiredScope],
        requiredScope,
        rows: leaked,
        query: OTHER_PREFIX,
      });
      assertDenied(denied, 'TENANT_FORBIDDEN');

      const filtered = readTenantSurface({
        surface,
        sessionOrganizationId: SESSION_ORG_ID,
        resourceOrganizationId: SESSION_ORG_ID,
        grantedScopes: [requiredScope],
        requiredScope,
        rows: leaked,
        query: OTHER_PREFIX,
      });
      assert.equal(filtered.ok, true);
      if (!filtered.ok) return;
      assert.deepEqual(filtered.suggestions, []);
      assert.deepEqual(filtered.autocomplete, []);
      assertNoOtherTenantLeak(filtered);
    }
  });
});
