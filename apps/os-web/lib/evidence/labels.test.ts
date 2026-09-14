import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { confidenceLabel, confirmationLabel, sourceLabel } from './labels';

describe('evidence labels', () => {
  it('does not show internal source or confidence names', () => {
    const copy = [
      sourceLabel('customer_message'),
      sourceLabel('ai_inferred'),
      confirmationLabel('unconfirmed'),
      confidenceLabel('high'),
    ].join('\n');
    assert.equal(copy.includes('customer_message'), false);
    assert.equal(copy.includes('ai_inferred'), false);
    assert.equal(copy.includes('unconfirmed'), false);
    assert.match(copy, /Dicho por el cliente/);
    assert.match(copy, /Sugerido por IA/);
    assert.match(copy, /No confirmado/);
    assert.match(copy, /Alta/);
    assert.doesNotMatch(copy, /%|87\./);
  });
});
