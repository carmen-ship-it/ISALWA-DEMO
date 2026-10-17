import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  clearTenantScopedBrowserState,
  isSelectableOrganization,
  resolveOrganizationSelection,
} from './organization-selection';

const A = { organizationId: 'org-a', legalName: 'Empresa A' };
const B = { organizationId: 'org-b', legalName: 'Empresa B' };
const webRoot = join(__dirname, '..', '..');
const source = (path: string) => readFileSync(join(webRoot, path), 'utf8');

describe('Review R3 organization selection (F09)', () => {
  it('no membership is an honest no-access state, never a default org', () => {
    assert.deepEqual(resolveOrganizationSelection([], 'org-a'), { state: 'none' });
  });

  it('one membership is used, even over a stale or tampered previous choice', () => {
    assert.deepEqual(resolveOrganizationSelection([A], null), { state: 'selected', organizationId: 'org-a', organizations: [A] });
    assert.deepEqual(resolveOrganizationSelection([A], 'org-x'), { state: 'selected', organizationId: 'org-a', organizations: [A] });
  });

  it('several memberships keep a still-valid previous choice', () => {
    assert.deepEqual(resolveOrganizationSelection([A, B], 'org-b'), { state: 'selected', organizationId: 'org-b', organizations: [A, B] });
  });

  it('several memberships without a choice require one', () => {
    assert.deepEqual(resolveOrganizationSelection([A, B], undefined), { state: 'choose', organizations: [A, B], staleSelection: false });
  });

  it('several memberships with a stale or tampered choice require a new one', () => {
    assert.deepEqual(resolveOrganizationSelection([A, B], 'org-x'), { state: 'choose', organizations: [A, B], staleSelection: true });
  });

  it('a switch is accepted only for a current option', () => {
    assert.equal(isSelectableOrganization([A, B], 'org-b'), true);
    assert.equal(isSelectableOrganization([A, B], 'org-x'), false);
    assert.equal(isSelectableOrganization([A, B], ''), false);
    assert.equal(isSelectableOrganization([], 'org-a'), false);
  });

  it('switching clears unscoped session storage', () => {
    let cleared = false;
    clearTenantScopedBrowserState({ sessionStorage: { clear: () => { cleared = true; } } as Storage });
    assert.equal(cleared, true);
  });

  it('no hard-coded company ids remain in the organization path', () => {
    const actions = source('lib/auth/actions.ts');
    const middleware = source('middleware.ts');
    for (const text of [actions, middleware]) {
      assert.doesNotMatch(text, /QA_REAL_ORGANIZATION_ID|QA_SYNTH_ORGANIZATION_ID|organizationIdForCompany|OWNER_EFFECTIVE_COMPANY/);
    }
    assert.doesNotMatch(actions, /DEMO_DATA_MODE_COOKIE|DATA_MODE_REQUEST_HEADER/, 'data mode never selects an organization');
    assert.match(actions, /listSessionOrganizations/);
  });

  it('the Journey never changes organization or data mode', () => {
    const provider = source('components/journey/journey-provider.tsx');
    const openStory = provider.slice(provider.indexOf('const openStory'), provider.indexOf('const closeStory'));
    assert.doesNotMatch(openStory, /setDataMode|datos|company/i);
    assert.doesNotMatch(provider, /dataMode|datos|cookie|Company|organizationId/);
  });
});
