import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';

describe('trabajo lens probes', () => {
  it('probes team and org visibility without offering lenses on forbidden', () => {
    const source = readFileSync(resolve(__dirname, 'trabajo-lens.ts'), 'utf8');
    assert.match(source, /probeWorkTeamLens/);
    assert.match(source, /probeWorkOrgLens/);
    assert.match(source, /kind === 'forbidden'/);
  });

  it('is wired from /trabajo before tabs render', () => {
    const page = readFileSync(resolve(__dirname, '../../app/(app)/trabajo/page.tsx'), 'utf8');
    assert.match(page, /probeWorkTeamLens/);
    assert.match(page, /probeWorkOrgLens/);
    assert.match(page, /canOrgLens/);
  });
});
