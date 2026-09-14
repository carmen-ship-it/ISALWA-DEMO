import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  AI_ALLOWED_INTENTS,
  AI_DENIED_INTENTS,
  AI_MAX_OUTPUT_TOKENS,
  AI_MAX_PROVIDER_RETRIES,
  AI_ORG_MONTHLY_LIMIT,
  AI_USER_DAILY_LIMIT,
  AiNotAllowedError,
  assertAiAllowed,
  isAiEnabled,
} from './limits';

const originalAiEnabled = process.env.AI_ENABLED;

afterEach(() => {
  if (originalAiEnabled === undefined) {
    delete process.env.AI_ENABLED;
  } else {
    process.env.AI_ENABLED = originalAiEnabled;
  }
});

describe('AI limits', () => {
  it('exports the pilot caps', () => {
    assert.equal(AI_USER_DAILY_LIMIT, 20);
    assert.equal(AI_ORG_MONTHLY_LIMIT, 300);
    assert.equal(AI_MAX_OUTPUT_TOKENS, 800);
    assert.equal(AI_MAX_PROVIDER_RETRIES, 1);
    assert.deepEqual(AI_ALLOWED_INTENTS, ['summarize_customer', 'ask', 'draft_follow_up']);
    assert.deepEqual(AI_DENIED_INTENTS, ['approve', 'convert', 'reassign', 'send']);
  });

  it('is disabled unless AI_ENABLED is exactly true', () => {
    delete process.env.AI_ENABLED;
    assert.equal(isAiEnabled(), false);

    process.env.AI_ENABLED = 'false';
    assert.equal(isAiEnabled(), false);

    process.env.AI_ENABLED = '1';
    assert.equal(isAiEnabled(), false);

    process.env.AI_ENABLED = 'TRUE';
    assert.equal(isAiEnabled(), false);

    process.env.AI_ENABLED = 'true';
    assert.equal(isAiEnabled(), true);
  });

  it('denies by default in Spanish when disabled', () => {
    delete process.env.AI_ENABLED;

    assert.throws(
      () =>
        assertAiAllowed({
          intent: 'ask',
          userDailyCount: 0,
          orgMonthlyCount: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AiNotAllowedError);
        assert.equal(error.code, 'disabled');
        assert.match(error.message, /no está activada/);
        assert.match(error.message, /sigue disponible/);
        return true;
      },
    );
  });

  it('denies business actions even when enabled and under the caps', () => {
    process.env.AI_ENABLED = 'true';

    for (const intent of AI_DENIED_INTENTS) {
      assert.throws(
        () =>
          assertAiAllowed({
            intent,
            userDailyCount: 0,
            orgMonthlyCount: 0,
          }),
        (error: unknown) => {
          assert.ok(error instanceof AiNotAllowedError);
          assert.equal(error.code, 'intent_denied');
          assert.match(error.message, /no puede ejecutar/);
          return true;
        },
      );
    }
  });

  it('denies the user daily cap and the org monthly cap', () => {
    process.env.AI_ENABLED = 'true';

    assert.throws(
      () =>
        assertAiAllowed({
          intent: 'summarize_customer',
          userDailyCount: AI_USER_DAILY_LIMIT,
          orgMonthlyCount: 0,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AiNotAllowedError);
        assert.equal(error.code, 'user_daily');
        assert.match(error.message, /límite diario de 20/);
        return true;
      },
    );

    assert.throws(
      () =>
        assertAiAllowed({
          intent: 'draft_follow_up',
          userDailyCount: 0,
          orgMonthlyCount: AI_ORG_MONTHLY_LIMIT,
        }),
      (error: unknown) => {
        assert.ok(error instanceof AiNotAllowedError);
        assert.equal(error.code, 'org_monthly');
        assert.match(error.message, /límite mensual de 300/);
        return true;
      },
    );
  });

  it('allows an allowlisted intent under the caps and returns the output cap', () => {
    process.env.AI_ENABLED = 'true';

    const allowance = assertAiAllowed({
      intent: 'ask',
      userDailyCount: AI_USER_DAILY_LIMIT - 1,
      orgMonthlyCount: AI_ORG_MONTHLY_LIMIT - 1,
    });

    assert.equal(allowance.allowed, true);
    assert.equal(allowance.intent, 'ask');
    assert.equal(allowance.maxOutputTokens, 800);
    assert.equal(allowance.maxProviderRetries, 1);
  });
});
