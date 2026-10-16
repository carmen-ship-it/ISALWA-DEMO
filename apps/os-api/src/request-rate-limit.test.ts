import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpException } from '@nestjs/common';
import {
  enforceRequestRateLimit,
  REQUEST_RATE_LIMITS,
  type RateLimitCounter,
} from './request-rate-limit';

function memoryCounter(): RateLimitCounter & { keys: string[] } {
  const counts = new Map<string, number>();
  const keys: string[] = [];
  return {
    keys,
    async hit({ organizationId, bucketKey, windowMs, now }) {
      const start = Math.floor((now ?? new Date()).getTime() / windowMs) * windowMs;
      const key = `${organizationId}|${bucketKey}|${start}`;
      keys.push(`${organizationId}|${bucketKey}`);
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { count, resetAt: new Date(start + windowMs) };
    },
  };
}

async function denial(run: () => Promise<void>): Promise<{ status: number; body: unknown } | null> {
  try {
    await run();
    return null;
  } catch (err) {
    assert.ok(err instanceof HttpException);
    return { status: err.getStatus(), body: err.getResponse() };
  }
}

const now = new Date('2026-10-16T21:30:30.000Z');
const session = (memberId: string, organizationId = 'org-a') => ({ organizationId, actorMemberId: memberId });

describe('request rate limits (V2 §18.1)', () => {
  it('allows the configured search volume, then 429 with a body that names no user or rule', async () => {
    const counter = memoryCounter();
    for (let i = 0; i < REQUEST_RATE_LIMITS.search.perMember; i += 1) {
      assert.equal(await denial(() => enforceRequestRateLimit(counter, 'search', session('m1'), now)), null);
    }
    const res = await denial(() => enforceRequestRateLimit(counter, 'search', session('m1'), now));
    assert.deepEqual(res, { status: 429, body: { code: 'RATE_LIMITED', retryAfterSeconds: 30 } });
    assert.equal(JSON.stringify(res).includes('m1'), false);
    assert.equal(await denial(() => enforceRequestRateLimit(counter, 'search', session('m2'), now)), null);
  });

  it('invitations are limited per member and per organization per day', async () => {
    const counter = memoryCounter();
    for (let i = 0; i < REQUEST_RATE_LIMITS.invitation.perMember; i += 1) {
      await enforceRequestRateLimit(counter, 'invitation', session('admin-1'), now);
    }
    const memberLimited = await denial(() => enforceRequestRateLimit(counter, 'invitation', session('admin-1'), now));
    assert.equal(memberLimited?.status, 429);

    const orgCounter = memoryCounter();
    let allowed = 0;
    for (let admin = 0; admin < 6; admin += 1) {
      for (let i = 0; i < REQUEST_RATE_LIMITS.invitation.perMember; i += 1) {
        const res = await denial(() =>
          enforceRequestRateLimit(orgCounter, 'invitation', session(`admin-${admin}`), now),
        );
        if (!res) allowed += 1;
      }
    }
    assert.equal(allowed, REQUEST_RATE_LIMITS.invitation.perOrganizationPerDay);
    assert.ok(orgCounter.keys.includes('org-a|invitation:organization'));
  });

  it('keys carry the organization, so the same member id in another org has its own budget', async () => {
    const counter = memoryCounter();
    for (let i = 0; i < REQUEST_RATE_LIMITS.command.perMember; i += 1) {
      await enforceRequestRateLimit(counter, 'command', session('same', 'org-a'), now);
    }
    assert.equal((await denial(() => enforceRequestRateLimit(counter, 'command', session('same', 'org-a'), now)))?.status, 429);
    assert.equal(await denial(() => enforceRequestRateLimit(counter, 'command', session('same', 'org-b'), now)), null);
  });
});
