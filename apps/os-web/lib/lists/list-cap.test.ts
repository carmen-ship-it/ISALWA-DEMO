import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { pushListCap } from './list-cap';

describe('list cap truth', () => {
  it('records a cap only when the page says more may exist', () => {
    const caps: Array<{ hasMore: true; limit: number }> = [];
    pushListCap(caps, { items: [{ id: '1' }], meta: { hasMore: false, limit: 100 } }, 100);
    assert.equal(caps.length, 0);
    pushListCap(caps, { items: new Array(100), meta: { hasMore: true, limit: 100 } }, 100);
    assert.deepEqual(caps, [{ hasMore: true, limit: 100 }]);
  });

  it('uses the shown slice when the loader drops rows past a hard cut', () => {
    const caps: Array<{ hasMore: true; limit: number }> = [];
    pushListCap(caps, { items: new Array(50), meta: { hasMore: false, limit: 50 } }, 50, 25);
    assert.deepEqual(caps, [{ hasMore: true, limit: 25 }]);
  });

  it('keeps the operator sentence in the notice component', () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../components/lists/list-cap-notice.tsx'),
      'utf8',
    );
    assert.match(source, /Mostrando los primeros \{cap\.limit\} resultados\. Use los filtros para acotar la vista\./);
  });
});
