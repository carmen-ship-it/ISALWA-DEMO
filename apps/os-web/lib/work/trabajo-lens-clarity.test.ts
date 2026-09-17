import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { trabajoLensClarity } from './trabajo-lens-clarity';

describe('trabajo lens clarity', () => {
  it('distinguishes Mío from Equipo and Empresa without inventing assignees', () => {
    assert.match(trabajoLensClarity('mine'), /a su nombre/i);
    assert.match(trabajoLensClarity('team'), /equipo/i);
    assert.match(trabajoLensClarity('org'), /empresa/i);
    for (const view of ['mine', 'team', 'org', 'overdue'] as const) {
      assert.doesNotMatch(trabajoLensClarity(view), /SLA|assignee invent|auto-?asign/i);
    }
  });

  it('is surfaced under Mi trabajo tabs', () => {
    const page = readFileSync(resolve(__dirname, '../../app/(app)/trabajo/page.tsx'), 'utf8');
    assert.match(page, /trabajoLensClarity/);
    assert.match(page, /Mío/);
    assert.match(page, /Equipo/);
    assert.match(page, /Empresa/);
  });
});
