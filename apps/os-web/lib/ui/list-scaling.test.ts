import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LIST_SCALE_COMPACT_MAX,
  LIST_SCALE_PREVIEW_DEFAULT,
  LIST_SCALE_PREVIEW_LARGE,
  listScaleExpandLabel,
  presentListScale,
  sliceForListScale,
} from '@/lib/ui/list-scaling';

describe('list scaling helpers', () => {
  it('treats 0 as empty', () => {
    const scale = presentListScale(0);
    assert.equal(scale.mode, 'empty');
    assert.equal(scale.showExpand, false);
    assert.deepEqual(sliceForListScale([], false), []);
  });

  it('keeps 1–5 compact without expand', () => {
    for (let n = 1; n <= LIST_SCALE_COMPACT_MAX; n += 1) {
      const scale = presentListScale(n);
      assert.equal(scale.mode, 'compact');
      assert.equal(scale.visibleCount, n);
      assert.equal(scale.showExpand, false);
    }
  });

  it('scales 6+ with default preview 5 and Ver todos (N)', () => {
    const scale = presentListScale(12);
    assert.equal(scale.mode, 'scaled');
    assert.equal(scale.visibleCount, LIST_SCALE_PREVIEW_DEFAULT);
    assert.equal(scale.showExpand, true);
    assert.equal(listScaleExpandLabel(12), 'Ver todos (12)');

    const items = Array.from({ length: 12 }, (_, i) => i);
    assert.deepEqual(sliceForListScale(items, false), [0, 1, 2, 3, 4]);
    assert.deepEqual(sliceForListScale(items, true), items);
  });

  it('allows large preview of 10', () => {
    const scale = presentListScale(14, LIST_SCALE_PREVIEW_LARGE);
    assert.equal(scale.visibleCount, LIST_SCALE_PREVIEW_LARGE);
    const items = Array.from({ length: 14 }, (_, i) => i);
    assert.equal(sliceForListScale(items, false, LIST_SCALE_PREVIEW_LARGE).length, 10);
  });
});
