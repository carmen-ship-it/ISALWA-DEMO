import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FINANCE_OPERATIONAL_RECORD_SCOPE } from '@isalwa/os-contracts';
import {
  CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES,
  assertCarmenOwnerEvaluationGrantListSafe,
} from './staging-carmen-owner-evaluation-grant-spec';

describe('carmen owner-evaluation grant list', () => {
  it('includes finance.operational.record and forbids system.admin shortcuts', () => {
    assert.equal(
      CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES.includes(FINANCE_OPERATIONAL_RECORD_SCOPE),
      true,
    );
    assert.equal(CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES.includes('system.admin' as never), false);
    assert.equal(CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES.includes('people.admin' as never), false);
    assert.doesNotThrow(() =>
      assertCarmenOwnerEvaluationGrantListSafe(CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES),
    );
    assert.throws(
      () =>
        assertCarmenOwnerEvaluationGrantListSafe([
          ...CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES,
          'system.admin',
        ]),
      /OWNER_EVAL_FORBIDDEN_SCOPE:system\.admin/,
    );
  });
});
