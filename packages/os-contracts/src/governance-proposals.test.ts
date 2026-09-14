import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GOVERNANCE_PROPOSALS } from './governance-proposals';

describe('governance proposals', () => {
  it('does not assign a scope string or mark any proposal implemented', () => {
    for (const proposal of GOVERNANCE_PROPOSALS) {
      assert.equal(proposal.implemented, false);
      assert.equal(proposal.proposedScopeString, null);
      assert.match(proposal.id, /CROSS_LANE_CHANGE_REQUEST/);
    }
    const serialized = JSON.stringify(GOVERNANCE_PROPOSALS);
    assert.equal(serialized.includes('quote.create'), false);
    assert.equal(serialized.includes('visit.check_in'), false);
    assert.equal(serialized.includes('location.detail.read'), false);
    assert.equal(serialized.includes('coordination.decision.read'), false);
  });
});
