import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const repoRoot = resolve(root, '../..');

describe('finance Contexto payment layout', () => {
  it('lets the Contexto card expand with selector results and does not clip them', () => {
    const desk = readFileSync(resolve(root, 'components/finance/finance-operational-desk.tsx'), 'utf8');
    const select = readFileSync(resolve(root, 'components/experience/searchable-select.tsx'), 'utf8');
    const layout = readFileSync(resolve(repoRoot, 'packages/ui/src/components/layout.tsx'), 'utf8');

    assert.match(desk, /data-finance-contexto/);
    assert.match(desk, /clip=\{false\}/);
    assert.match(desk, /overflow-visible/);
    assert.match(desk, /lg:items-start/);
    assert.match(desk, /data-finance-sesion/);
    assert.match(desk, /self-start/);

    assert.match(select, /data-searchable-select/);
    assert.match(select, /relative z-30 mt-2 max-h-64/);
    assert.doesNotMatch(select, /absolute z-30/);

    const party = readFileSync(resolve(root, 'components/operating/server-party-typeahead.tsx'), 'utf8');
    assert.match(party, /relative z-20 mt-2 max-h-60/);
    assert.doesNotMatch(party, /absolute z-20/);

    assert.match(layout, /clip\?: boolean/);
    assert.match(layout, /clip \? 'overflow-hidden' : 'overflow-visible'/);
  });
});
