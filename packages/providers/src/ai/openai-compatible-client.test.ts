import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildOpenAICompatibleChatBody,
  chatViaOpenAICompatible,
  usesMaxCompletionTokens,
} from './openai-compatible-client';

describe('OpenAI-compatible chat request body', () => {
  it('uses max_completion_tokens for gpt-5.6-luna and gpt-5 family', () => {
    assert.equal(usesMaxCompletionTokens('gpt-5.6-luna'), true);
    assert.equal(usesMaxCompletionTokens('GPT-5.6-LUNA'), true);
    assert.equal(usesMaxCompletionTokens('gpt-5'), true);
    assert.equal(usesMaxCompletionTokens('gpt-5o'), true);

    const body = buildOpenAICompatibleChatBody(
      [{ role: 'user', content: 'hi' }],
      { model: 'gpt-5.6-luna', maxTokens: 400 },
    );
    assert.equal(body.model, 'gpt-5.6-luna');
    assert.equal(body.max_completion_tokens, 400);
    assert.equal('max_tokens' in body, false);
  });

  it('uses max_tokens for legacy chat models', () => {
    assert.equal(usesMaxCompletionTokens('gpt-4o-mini'), false);
    assert.equal(usesMaxCompletionTokens('gpt-4o'), false);
    assert.equal(usesMaxCompletionTokens('gpt-3.5-turbo'), false);

    const body = buildOpenAICompatibleChatBody(
      [{ role: 'user', content: 'hi' }],
      { model: 'gpt-4o-mini', maxTokens: 800 },
    );
    assert.equal(body.max_tokens, 800);
    assert.equal('max_completion_tokens' in body, false);
  });

  it('uses max_completion_tokens for o-series models', () => {
    assert.equal(usesMaxCompletionTokens('o1-mini'), true);
    assert.equal(usesMaxCompletionTokens('o3-mini'), true);
    const body = buildOpenAICompatibleChatBody(
      [{ role: 'user', content: 'hi' }],
      { model: 'o3-mini' },
    );
    assert.equal(body.max_completion_tokens, 800);
    assert.equal('max_tokens' in body, false);
  });

  it('chatViaOpenAICompatible posts max_completion_tokens for luna', async () => {
    const originalFetch = globalThis.fetch;
    let captured: { url?: string; body?: Record<string, unknown> } = {};
    globalThis.fetch = (async (input, init) => {
      captured = {
        url: String(input),
        body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
      };
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"summary":"ok","suggestion":"ok","facts":[]}' } }],
          usage: { prompt_tokens: 1, completion_tokens: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const result = await chatViaOpenAICompatible([{ role: 'user', content: 'ping' }], {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5.6-luna',
        maxTokens: 321,
        maxRetries: 0,
      });
      assert.ok(result.content.length > 0);
      assert.equal(captured.url, 'https://api.openai.com/v1/chat/completions');
      assert.equal(captured.body?.model, 'gpt-5.6-luna');
      assert.equal(captured.body?.max_completion_tokens, 321);
      assert.equal('max_tokens' in (captured.body ?? {}), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('chatViaOpenAICompatible posts max_tokens for gpt-4o-mini', async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = (async (_input, init) => {
      capturedBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'legacy-ok' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      await chatViaOpenAICompatible([{ role: 'user', content: 'ping' }], {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1/',
        model: 'gpt-4o-mini',
        maxTokens: 100,
        maxRetries: 0,
      });
      assert.equal(capturedBody.max_tokens, 100);
      assert.equal('max_completion_tokens' in capturedBody, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
