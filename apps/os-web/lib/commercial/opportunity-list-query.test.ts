/**
 * Demo oportunidades desk must not invent a title search.
 * Isolation stays on the client name; q is only the user's search.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('oportunidades demo list query', () => {
  it('does not default the title search to DEMO', () => {
    const page = readFileSync(resolve('app/(app)/oportunidades/page.tsx'), 'utf8');
    assert.doesNotMatch(page, /!\s*listState\.q\s*\?\s*'DEMO'/);
    assert.match(page, /listState\.q \? \{ q: listState\.q \}/);
    assert.match(page, /filterByDemoDataMode/);
    assert.match(page, /isDemoDisplayName\(partyLabel/);
  });
});
