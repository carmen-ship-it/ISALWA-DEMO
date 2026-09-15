import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OS_INTERACTIVE_TX,
  PRISMA_DEFAULT_INTERACTIVE_TX_TIMEOUT_MS,
} from './prisma-interactive-tx';

describe('prisma interactive tx config (party)', () => {
  it('uses bounded options above Prisma default timeout', () => {
    assert.equal(PRISMA_DEFAULT_INTERACTIVE_TX_TIMEOUT_MS, 5_000);
    assert.equal(OS_INTERACTIVE_TX.maxWait, 10_000);
    assert.equal(OS_INTERACTIVE_TX.timeout, 20_000);
    assert.ok(OS_INTERACTIVE_TX.timeout > PRISMA_DEFAULT_INTERACTIVE_TX_TIMEOUT_MS);
    assert.ok(OS_INTERACTIVE_TX.timeout < 120_000, 'must not be effectively unlimited');
    assert.ok(OS_INTERACTIVE_TX.maxWait < OS_INTERACTIVE_TX.timeout);
  });
});
