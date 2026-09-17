import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAiHostedVisibility } from './hosted-state';

function env(input: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return input as NodeJS.ProcessEnv;
}

describe('resolveAiHostedVisibility', () => {
  it('hides when AI is off', () => {
    assert.deepEqual(resolveAiHostedVisibility(env({})), {
      show: false,
      citationsLive: false,
      blocker: 'DISABLED',
    });
  });

  it('hides when live provider lacks credential', () => {
    assert.deepEqual(
      resolveAiHostedVisibility(env({ AI_ENABLED: 'true', AI_PROVIDER: 'openai' })),
      { show: false, citationsLive: false, blocker: 'PROVIDER_BLOCKED' },
    );
  });

  it('shows mock pilot without live citations', () => {
    assert.deepEqual(resolveAiHostedVisibility(env({ AI_ENABLED: 'true', AI_PROVIDER: 'mock' })), {
      show: true,
      citationsLive: false,
    });
  });

  it('shows live surfaces when credential is present', () => {
    assert.deepEqual(
      resolveAiHostedVisibility(
        env({
          AI_ENABLED: 'true',
          AI_PROVIDER: 'openai',
          OPENAI_ISALWA_API_KEY: 'sk-test',
        }),
      ),
      { show: true, citationsLive: true },
    );
  });
});
