import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('trabajo list polish surfaces', () => {
  it('keeps search and presentation controls on URL state without authority keys', () => {
    const page = read('app/(app)/trabajo/page.tsx');
    const toolbar = read('components/work/trabajo-list-toolbar.tsx');
    const filters = read('components/lists/list-toolbar.tsx');
    const list = read('components/work/work-list.tsx');

    assert.match(page, /controls\.q \? \{ q: controls\.q \}/);
    assert.match(page, /TrabajoListToolbar/);
    assert.match(page, /showHeader/);
    assert.match(toolbar, /FilterPopover/);
    assert.match(toolbar, /listFocusLabel\('approval'\)/);
    assert.match(filters, /Limpiar filtros/);
    assert.match(filters, /aria-haspopup="dialog"/);
    assert.match(list, /OperatingListFrame/);
    assert.match(list, /density=\{density\}/);
    assert.doesNotMatch(page, /ownerMemberId\s*:/);
    assert.doesNotMatch(toolbar, /people\.admin|grantedScopes|capability/);
  });

  it('keeps inicio attention denser without changing attention rules', () => {
    const panel = read('components/work/inicio-attention-panel.tsx');
    assert.match(panel, /density="compact"/);
    assert.match(panel, /p-2\.5 md:p-3/);
    assert.doesNotMatch(panel, /due soon|priorityScore|agingDays/);
  });
});
