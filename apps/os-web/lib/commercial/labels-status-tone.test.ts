import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { statusTone } from './labels';

describe('commercial statusTone semantics', () => {
  it('never maps Abierta/open to success green', () => {
    assert.equal(statusTone('open'), 'open');
    assert.notEqual(statusTone('open'), 'success');
    assert.notEqual(statusTone('open'), 'approved');
    assert.notEqual(statusTone('open'), 'completed');
  });

  it('maps draft/submitted/terminal states to StatusPill semantics', () => {
    assert.equal(statusTone('draft'), 'draft');
    assert.equal(statusTone('submitted'), 'in_progress');
    assert.equal(statusTone('accepted'), 'approved');
    assert.equal(statusTone('won'), 'approved');
    assert.equal(statusTone('cancelled'), 'cancelled');
    assert.equal(statusTone('lost'), 'rejected');
  });
});
