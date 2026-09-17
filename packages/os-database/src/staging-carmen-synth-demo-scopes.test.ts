import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterOwnerDemoSynthScopes,
  OWNER_DEMO_SYNTH_BUSINESS_SCOPES,
  OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES,
  OWNER_DEMO_SYNTH_SCOPE_RATIONALE,
} from './staging-carmen-synth-demo-scopes';

describe('owner-demo SYNTH scope policy', () => {
  it('forbids admin and QA bypass scopes', () => {
    assert.ok(OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES.includes('people.admin'));
    assert.ok(OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES.includes('master_data.admin'));
    assert.ok(OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES.includes('qa.access'));
    assert.ok(OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES.includes('system.admin'));
  });

  it('filters a copied REAL grant set down to business scopes only', () => {
    const filtered = filterOwnerDemoSynthScopes([
      ...OWNER_DEMO_SYNTH_BUSINESS_SCOPES,
      'people.admin',
      'master_data.admin',
      'qa.access',
      'system.admin',
    ]);
    assert.equal(filtered.includes('people.admin'), false);
    assert.equal(filtered.includes('master_data.admin'), false);
    assert.equal(filtered.includes('qa.access'), false);
    assert.equal(filtered.includes('system.admin'), false);
    assert.equal(filtered.length, OWNER_DEMO_SYNTH_BUSINESS_SCOPES.length);
  });

  it('documents rationale for every remaining business scope', () => {
    for (const key of OWNER_DEMO_SYNTH_BUSINESS_SCOPES) {
      assert.ok(OWNER_DEMO_SYNTH_SCOPE_RATIONALE[key]?.length > 0, key);
    }
  });
});
