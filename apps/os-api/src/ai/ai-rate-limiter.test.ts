import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AiRateLimiter } from './ai-rate-limiter';

describe('AiRateLimiter', () => {
  it('enforces per-member minute and concurrency limits', () => {
    const limiter = new AiRateLimiter({
      memberRatePerMinute: 2,
      memberRatePerHour: 30,
      orgRatePerDay: 250,
      memberMaxConcurrency: 1,
      orgMaxConcurrency: 5,
    });
    assert.equal(limiter.tryAcquire('org', 'mem'), null);
    assert.equal(limiter.tryAcquire('org', 'mem'), 'AI_CONCURRENCY_MEMBER');
    limiter.release('org', 'mem');
    assert.equal(limiter.tryAcquire('org', 'mem'), null);
    limiter.release('org', 'mem');
    assert.equal(limiter.tryAcquire('org', 'mem'), 'AI_RATE_MEMBER_MINUTE');
  });
});
