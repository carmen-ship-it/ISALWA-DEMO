import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAiProviderGatewayReady,
  resolveAiProviderGatewayState,
} from './ai-provider-gateway';

describe('resolveAiProviderGatewayState', () => {
  it('is disabled when AI_ENABLED is not true', () => {
    assert.deepEqual(resolveAiProviderGatewayState({ AI_ENABLED: 'false' }), { status: 'disabled' });
    assert.deepEqual(resolveAiProviderGatewayState({}), { status: 'disabled' });
  });

  it('blocks live provider when credential is missing', () => {
    const state = resolveAiProviderGatewayState({
      AI_ENABLED: 'true',
      AI_PROVIDER: 'openai',
    });
    assert.deepEqual(state, {
      status: 'blocked',
      code: 'PROVIDER_BLOCKED',
      reason: 'missing_credential',
    });
  });

  it('is ready live with citations when key is present', () => {
    const state = resolveAiProviderGatewayState({
      AI_ENABLED: 'true',
      AI_PROVIDER: 'openai',
      OPENAI_ISALWA_API_KEY: 'sk-test',
    });
    assert.deepEqual(state, { status: 'ready', mode: 'live', citationsLive: true });
  });

  it('is ready mock without live citations', () => {
    const state = resolveAiProviderGatewayState({
      AI_ENABLED: 'true',
      AI_PROVIDER: 'mock',
    });
    assert.deepEqual(state, { status: 'ready', mode: 'mock', citationsLive: false });
  });

  it('assertAiProviderGatewayReady throws AI_UNAVAILABLE when blocked', () => {
    assert.throws(
      () =>
        assertAiProviderGatewayReady({
          AI_ENABLED: 'true',
          AI_PROVIDER: 'openai',
        }),
      (err: unknown) => err instanceof Error && err.message === 'AI_UNAVAILABLE',
    );
  });

  it('blocks unknown provider modes', () => {
    const state = resolveAiProviderGatewayState({
      AI_ENABLED: 'true',
      AI_PROVIDER: 'anthropic',
    });
    assert.deepEqual(state, {
      status: 'blocked',
      code: 'PROVIDER_BLOCKED',
      reason: 'invalid_provider',
    });
  });

  it('treats openai-compatible like openai for credential gate', () => {
    assert.deepEqual(
      resolveAiProviderGatewayState({
        AI_ENABLED: 'true',
        AI_PROVIDER: 'openai-compatible',
      }),
      {
        status: 'blocked',
        code: 'PROVIDER_BLOCKED',
        reason: 'missing_credential',
      },
    );
  });
});
