import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAiProvider, MockAiProvider } from './index';

describe('AI providers', () => {
  it('mock assist stays offline with evidence refs', async () => {
    const provider = new MockAiProvider();
    const result = await provider.assist({
      feature: 'ask',
      subjectType: 'issue',
      subjectId: 'issue-1',
      facts: ['Incidencia issue-1 (open): retraso'],
      evidenceRefs: [{ type: 'issue', id: 'issue-1' }],
    });
    assert.equal(result.modelCalled, false);
    assert.ok(result.summary.length > 0);
    assert.equal(result.evidenceRefs.length, 1);
  });

  it('createAiProvider falls back to mock without a key', () => {
    const provider = createAiProvider({ provider: 'openai' });
    assert.equal(provider.info.mode, 'mock');
  });
});
