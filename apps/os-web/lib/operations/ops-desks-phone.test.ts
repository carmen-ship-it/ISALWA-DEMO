import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('ops desks phone cards', () => {
  it('producción queue stacks as cards without phone H-scroll', () => {
    const table = read('components/production/production-ops-table.tsx');
    assert.match(table, /OperatingScanRow/);
    assert.match(table, /overflow-hidden/);
    assert.match(table, /md:overflow-x-auto/);
    assert.doesNotMatch(table, /mt-4 overflow-x-auto rounded/);
    assert.match(table, /hideOnMobile: true/);
  });

  it('almacén queue uses the same scan-row card pattern', () => {
    const page = read('app/(app)/almacen/page.tsx');
    assert.match(page, /OperatingScanRow/);
    assert.match(page, /overflow-hidden/);
    assert.match(page, /hideOnMobile: true/);
  });

  it('shared scan row keeps ≥44px open CTA on phone', () => {
    const scan = read('components/lists/operating-scan-row.tsx');
    assert.match(scan, /flex flex-col gap-2 md:grid/);
    assert.match(scan, /h-11/);
    assert.match(scan, /sm:h-8/);
  });
});
